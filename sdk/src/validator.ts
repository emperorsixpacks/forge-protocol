import express from "express";
import { ethers } from "ethers";
import { ValidatorConsensusClient } from "./validatorConsensus.js";
import { CommerceClient } from "./commerce.js";
import { KITE_TESTNET } from "./types.js";
import { createLogger } from "./logger.js";
import { openTunnel } from "./tunnel.js";
import type { ForgeConfig } from "./types.js";

export interface ValidatorConfig {
  port: number;
  evaluate: (description: string, deliverable: string) => Promise<boolean>;
  pollIntervalMs?: number;
  /** If set, auto-stake this amount on startup if not already staked */
  stakeAmount?: bigint;
}

export async function startValidator(validatorCfg: ValidatorConfig) {
  const log = createLogger("validator");
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY!, provider);

  const cfg: ForgeConfig = {
    signerOrProvider: signer,
    ...KITE_TESTNET,
    onTx: (hash) => log.info("tx", { hash, url: `https://testnet.kitescan.ai/tx/${hash}` }),
  };

  const consensus = new ValidatorConsensusClient(cfg);
  const commerce = new CommerceClient(cfg);

  // auto-stake if configured and not already staked
  if (validatorCfg.stakeAmount) {
    consensus.stakedAmount(signer.address).then(async (current: bigint) => {
      if (current === 0n) {
        log.info("auto_staking", { amount: validatorCfg.stakeAmount!.toString() });
        await consensus.stake(validatorCfg.stakeAmount!);
        log.info("staked", { amount: validatorCfg.stakeAmount!.toString() });
      } else {
        log.info("already_staked", { amount: current.toString() });
      }
    }).catch((e: Error) => log.warn("auto_stake_failed", { error: e.message }));
  }

  // ── Poll for open validation rounds ──────────────────────────────────────

  let startJobId = BigInt(process.env.START_JOB_ID ?? "1");

  async function pollAndVote() {
    let jobId = startJobId;
    while (true) {
      try {
        const job = await commerce.getJob(jobId);
        if (!job) break;
        const alreadyVoted = await consensus.hasVoted(jobId, signer.address);
        if (!alreadyVoted) {
          const { open } = await consensus.roundStatus(jobId);
          if (open) await evaluateAndVote(jobId);
        }
        jobId++;
      } catch {
        break; // no more jobs
      }
    }
    startJobId = jobId; // next poll starts here
  }

  async function evaluateAndVote(jobId: bigint) {
    log.info("evaluating_job", { jobId: jobId.toString() });
    try {
      const job = await commerce.getJob(jobId);
      if (!job.deliverable) {
        log.warn("no_deliverable", { jobId: jobId.toString() });
        return;
      }

      const approve = await validatorCfg.evaluate(job.description, job.deliverable);

      log.info("vote_cast", { jobId: jobId.toString(), vote: approve ? "APPROVE" : "REJECT" });
      await consensus.vote(jobId, approve);
    } catch (err) {
      log.error("vote_failed", { jobId: jobId.toString(), error: (err as Error).message });
    }
  }

  const interval = validatorCfg.pollIntervalMs ?? 10_000;
  setInterval(pollAndVote, interval);
  log.info("validator_polling", { interval, address: signer.address });

  // ── HTTP server — manual trigger + status ─────────────────────────────────

  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => res.json({
    name: "forge-validator",
    address: signer.address,
    polling_interval_ms: interval,
  }));

  app.post("/validate/:jobId", async (req, res) => {
    const jobId = BigInt(req.params.jobId);
    res.json({ status: "accepted", jobId: jobId.toString() });
    await evaluateAndVote(jobId);
  });

  app.get("/round/:jobId", async (req, res) => {
    const status = await consensus.roundStatus(BigInt(req.params.jobId));
    res.json({ ...status, approvals: status.approvals.toString(), rejections: status.rejections.toString() });
  });

  app.listen(validatorCfg.port, () => {
    log.info("validator_started", { port: validatorCfg.port });
    if (process.env.ENABLE_TUNNEL === "true") {
      openTunnel(validatorCfg.port)
        .then((url) => log.info("tunnel_open", { url }))
        .catch((err) => log.warn("tunnel_failed", { error: err.message }));
    }
  });
}
