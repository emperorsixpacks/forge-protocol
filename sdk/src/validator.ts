import express from "express";
import { ethers } from "ethers";
import { ValidatorConsensusClient } from "./validatorConsensus.js";
import { CommerceClient } from "./commerce.js";
import { KITE_TESTNET } from "./types.js";
import { createLogger } from "./logger.js";
import type { LLMProvider, MarcConfig } from "./types.js";

export interface ValidatorConfig {
  port: number;
  llm: LLMProvider;
  pollIntervalMs?: number;
}

export async function startValidator(validatorCfg: ValidatorConfig) {
  const log = createLogger("validator");
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const signer = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY!, provider);

  const cfg: MarcConfig = {
    signerOrProvider: signer,
    ...KITE_TESTNET,
    onTx: (hash) => log.info("tx", { hash, url: `https://testnet.kitescan.ai/tx/${hash}` }),
  };

  const consensus = new ValidatorConsensusClient(cfg);
  const commerce = new CommerceClient(cfg);

  // ── Poll for open validation rounds ──────────────────────────────────────

  // Track highest jobId we've seen so we can scan forward
  let lastCheckedJobId = BigInt(process.env.START_JOB_ID ?? "1");

  async function pollAndVote() {
    try {
      const alreadyVoted = await consensus.hasVoted(lastCheckedJobId, signer.address);
      if (!alreadyVoted) {
        const { open } = await consensus.roundStatus(lastCheckedJobId);
        if (open) {
          await evaluateAndVote(lastCheckedJobId);
        }
      }
      // advance to next job
      lastCheckedJobId++;
    } catch {
      // job doesn't exist yet — stay at current id
    }
  }

  async function evaluateAndVote(jobId: bigint) {
    log.info("evaluating_job", { jobId: jobId.toString() });
    try {
      const job = await commerce.getJob(jobId);
      if (!job.deliverable) {
        log.warn("no_deliverable", { jobId: jobId.toString() });
        return;
      }

      const prompt = `You are an impartial quality evaluator for AI agent work.

Job description: ${job.description}

Deliverable submitted by the agent:
${job.deliverable.startsWith("ipfs://") ? `[IPFS content at ${job.deliverable}]` : job.deliverable}

Does this deliverable adequately satisfy the job description?
Reply with exactly one word: APPROVE or REJECT`;

      const answer = (await validatorCfg.llm.complete(prompt)).trim().toUpperCase();
      const approve = answer.startsWith("APPROVE");

      log.info("vote_cast", { jobId: jobId.toString(), vote: approve ? "APPROVE" : "REJECT", answer });
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
    name: "marc-validator",
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

  app.listen(validatorCfg.port, () => log.info("validator_started", { port: validatorCfg.port }));
}
