import express from "express";
import { ethers } from "ethers";
import { IdentityClient } from "./identity.js";
import { CommerceClient } from "./commerce.js";
import { KITE_TESTNET } from "./types.js";
import { encrypt } from "./crypto.js";
import { createLogger } from "./logger.js";
import type { LLMProvider, ForgeConfig } from "./types.js";

export interface SellerConfig {
  agentId: string;
  port: number;
  capabilities: string[];
  description: string;
  priceUsdc: number;
  llm: LLMProvider;
  buildPrompt: (task: string) => string;
}

async function fireWebhook(url: string, body: unknown, log: ReturnType<typeof createLogger>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    log.info("webhook_sent", { url });
  } catch (err) {
    log.error("webhook_failed", { url, error: (err as Error).message });
  }
}

export async function startSeller(sellerCfg: SellerConfig) {
  const log = createLogger(sellerCfg.agentId);

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const signer = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);

  const cfg: ForgeConfig = {
    signerOrProvider: signer,
    ...KITE_TESTNET,
    onTx: (hash) => log.info("tx", { hash, url: `https://testnet.kitescan.ai/tx/${hash}` }),
  };

  const identity = new IdentityClient(cfg);
  try {
    const agentNftId = await identity.register(`ipfs://${sellerCfg.agentId}.json`);
    log.info("agent_registered", { agentNftId: agentNftId.toString() });
  } catch {
    log.info("agent_already_registered");
  }

  const manifest = {
    name: sellerCfg.agentId,
    description: sellerCfg.description,
    endpoint: `http://localhost:${sellerCfg.port}/execute`,
    capabilities: sellerCfg.capabilities,
    price_usdc: sellerCfg.priceUsdc,
    wallet: signer.address,
    input_schema: { task: "string", buyer_pubkey: "string (optional)", callback_url: "string (optional)" },
    output_schema: { result: "string (ECIES base64 if buyer_pubkey provided, else plaintext)" },
  };

  const app = express();
  app.use(express.json());

  app.get("/.well-known/agent.json", (_req, res) => res.json(manifest));
  app.get("/", (_req, res) => res.json(manifest));

  // ── AMP v1 execute ────────────────────────────────────────────────────────
  app.post("/execute", async (req, res) => {
    const { task_id, input, callback_url } = req.body;
    const task = input?.task ?? input?.prompt ?? JSON.stringify(input);
    const buyerPubKey: string | undefined = input?.buyer_pubkey;
    log.info("job_received", { task_id, encrypted: !!buyerPubKey, endpoint: "execute" });
    res.json({ status: "accepted" });

    try {
      const plaintext = await sellerCfg.llm.complete(sellerCfg.buildPrompt(task));
      const output = buyerPubKey ? encrypt(buyerPubKey, plaintext) : plaintext;
      log.info("job_completed", { task_id, encrypted: !!buyerPubKey });

      if (callback_url) {
        await fireWebhook(callback_url, { task_id, status: "success", result: { output, encrypted: !!buyerPubKey } }, log);
      }
    } catch (err) {
      log.error("job_failed", { task_id, error: (err as Error).message });
      if (callback_url) {
        await fireWebhook(callback_url, { task_id, status: "error", error: (err as Error).message }, log);
      }
    }
  });

  // ── Legacy MARC on-chain job ───────────────────────────────────────────────
  app.post("/job", async (req, res) => {
    const { jobId, task, buyer_pubkey, callback_url } = req.body;
    log.info("job_received", { jobId, encrypted: !!buyer_pubkey, endpoint: "job" });
    res.json({ status: "accepted", jobId });

    try {
      const plaintext = await sellerCfg.llm.complete(sellerCfg.buildPrompt(task));
      const deliverable = buyer_pubkey ? encrypt(buyer_pubkey, plaintext) : plaintext;

      const commerce = new CommerceClient(cfg);
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await commerce.submit(BigInt(jobId), deliverable);
          log.info("job_submitted_onchain", { jobId, attempt });
          break;
        } catch (e) {
          if (attempt === 5) throw e;
          log.warn("job_submit_retry", { jobId, attempt, error: (e as Error).message });
          await new Promise((r) => setTimeout(r, 4000));
        }
      }

      log.info("job_completed", { jobId, encrypted: !!buyer_pubkey });
      if (callback_url) {
        await fireWebhook(callback_url, { jobId, status: "submitted", encrypted: !!buyer_pubkey }, log);
      }
    } catch (err) {
      log.error("job_failed", { jobId, error: (err as Error).message });
      if (callback_url) {
        await fireWebhook(callback_url, { jobId, status: "error", error: (err as Error).message }, log);
      }
    }
  });

  app.listen(sellerCfg.port, () => log.info("seller_started", { port: sellerCfg.port }));
}
