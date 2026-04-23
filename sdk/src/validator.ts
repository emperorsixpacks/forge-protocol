import express from "express";
import { ethers } from "ethers";
import { ValidatorConsensusClient } from "./validatorConsensus.js";
import { CommerceClient } from "./commerce.js";
import { KITE_TESTNET } from "./types.js";
import { createLogger } from "./logger.js";
import { openTunnel } from "./tunnel.js";
import type { ForgeConfig } from "./types.js";

export const DEFAULT_VALIDATOR_PROMPT = `You are an impartial quality evaluator for AI agent work.
Given a job description and a deliverable, decide if the deliverable adequately satisfies the job.

Rules:
- Evaluate ONLY what is present in the deliverable. Do not assume data is missing unless the deliverable itself says so.
- APPROVE if the deliverable is a reasonable, good-faith attempt that addresses the job description.
- REJECT only if the deliverable is empty, completely off-topic, or explicitly fails the task.
- Do NOT reject because you think there might be more data — you cannot verify that.

Reply with APPROVE or REJECT followed by one sentence explaining why.`;

export interface ValidatorConfig {
  port: number;
  /** Receive the locked evaluation prompt, return approve + optional reason. */
  evaluate: (prompt: string) => Promise<boolean | { approve: boolean; reason?: string }>;
  pollIntervalMs?: number;
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
        log.info("auto_staking", { amount: validatorCfg.stakeAmount!.toString(), address: signer.address });
        await consensus.stake(validatorCfg.stakeAmount!);
        log.info("staked", { amount: validatorCfg.stakeAmount!.toString() });
      } else {
        log.info("already_staked", { amount: current.toString() });
      }
    }).catch((e: Error) => {
      if (e.message.includes("insufficient funds") || e.message.includes("INSUFFICIENT_FUNDS")) {
        log.error("insufficient_funds", {
          message: `Validator wallet has no KITE. Fund ${signer.address} at https://faucet.gokite.ai then restart.`,
          address: signer.address,
          faucet: "https://faucet.gokite.ai",
        });
      } else {
        log.warn("auto_stake_failed", { error: e.message });
      }
    });
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

      // open round if not already open
      const { open } = await consensus.roundStatus(jobId);
      if (!open) {
        try {
          await consensus.requestValidation(jobId);
        } catch (e) {
          // may already be open or closed — continue
        }
      }

      const prompt = `${DEFAULT_VALIDATOR_PROMPT}\n\nJob description: ${job.description}\n\nDeliverable: ${job.deliverable}`;
      const result = await validatorCfg.evaluate(prompt);
      const approve = typeof result === "boolean" ? result : result.approve;
      const reason = typeof result === "boolean" ? undefined : result.reason;

      log.info("vote_cast", { jobId: jobId.toString(), vote: approve ? "APPROVE" : "REJECT", ...(reason && { reason }) });
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
