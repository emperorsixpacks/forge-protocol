import express from "express";
import { ethers } from "ethers";
import { IdentityClient } from "./identity.js";
import { CommerceClient } from "./commerce.js";
import { KITE_TESTNET } from "./types.js";
import { encrypt } from "./crypto.js";
import { createLogger } from "./logger.js";
import { openTunnel } from "./tunnel.js";
import type { ForgeConfig } from "./types.js";

export interface SellerConfig {
  agentId: string;
  port: number;
  capabilities: string[];
  description: string;
  priceUsdt: number;
  /** Your agent logic — receive the task, return the deliverable. Use any AI framework you like. */
  execute: (task: string, jobId?: string) => Promise<string>;
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
    ...(process.env.VALIDATOR_CONSENSUS_CONTRACT && { validatorConsensusContract: process.env.VALIDATOR_CONSENSUS_CONTRACT }),
    onTx: (hash) => log.info("tx", { hash, url: `https://testnet.kitescan.ai/tx/${hash}` }),
  };

  const identity = new IdentityClient(cfg);
  // non-blocking — seller starts immediately even if RPC is slow
  identity.register(`ipfs://${sellerCfg.agentId}.json`)
    .then((id) => log.info("agent_registered", { agentNftId: id.toString() }))
    .catch(() => log.info("agent_already_registered"));

  const manifest: Record<string, any> = {
    name: sellerCfg.agentId,
    description: sellerCfg.description,
    endpoint: `http://localhost:${sellerCfg.port}/execute`,
    capabilities: sellerCfg.capabilities,
    price_usdt: sellerCfg.priceUsdt,
    wallet: signer.address,
    input_schema: { task: "string", buyer_pubkey: "string (optional)", callback_url: "string (optional)" },
    output_schema: { result: "string (ECIES base64 if buyer_pubkey provided, else plaintext)" },
  };

  // auto-open tunnel if ENABLE_TUNNEL=true
  if (process.env.ENABLE_TUNNEL === "true") {
    openTunnel(sellerCfg.port)
      .then(async (url) => {
        manifest.endpoint = `${url}/execute`;
        manifest.tunnel_url = url;
        log.info("tunnel_open", { url });
        // store public URL in on-chain identity metadata
        try {
          await identity.setAgentURI(1n, `ipfs://${sellerCfg.agentId}.json`);
          const encoded = new TextEncoder().encode(url);
          // store as metadata key "endpoint"
          const tx = await (identity as any).contract.setMetadata(1n, "endpoint", encoded);
          await tx.wait();
          log.info("endpoint_registered_onchain", { url });
        } catch { /* non-fatal */ }
      })
      .catch((err) => log.warn("tunnel_failed", { error: err.message }));
  }

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
      const plaintext = await sellerCfg.execute(task, task_id);
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
      const plaintext = await sellerCfg.execute(task, jobId);

      // submit plaintext on-chain so validators can evaluate it
      const commerce = new CommerceClient(cfg);
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await commerce.submit(BigInt(jobId), plaintext);
          log.info("job_submitted_onchain", { jobId, attempt });
          break;
        } catch (e) {
          const msg = (e as Error).message;
          if (msg.includes("invalid status")) {
            log.warn("job_already_submitted", { jobId });
            break;
          }
          if (attempt === 5) throw e;
          log.warn("job_submit_retry", { jobId, attempt, error: msg });
          await new Promise((r) => setTimeout(r, 4000));
        }
      }

      // send encrypted result to buyer via callback if pubkey provided
      if (callback_url) {
        const output = buyer_pubkey ? encrypt(buyer_pubkey, plaintext) : plaintext;
        await fireWebhook(callback_url, { jobId, status: "submitted", result: output, encrypted: !!buyer_pubkey }, log);
      }
    } catch (err) {
      log.error("job_failed", { jobId, error: (err as Error).message });
      if (callback_url) {
        await fireWebhook(callback_url, { jobId, status: "error", error: (err as Error).message }, log);
      }
    }
  });

  app.listen(sellerCfg.port, () => {
    log.info("seller_started", { port: sellerCfg.port });

    // register with registry and heartbeat every 30s
    const registryUrl = process.env.REGISTRY_URL;
    if (registryUrl) {
      const heartbeat = () => fetch(`${registryUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: sellerCfg.agentId,
          url: manifest.endpoint.replace("/execute", ""),
          description: sellerCfg.description,
          capabilities: sellerCfg.capabilities,
          priceUsdt: sellerCfg.priceUsdt,
          wallet: signer.address,
        }),
      }).catch(() => {}); // non-fatal
      heartbeat();
      setInterval(heartbeat, 30_000);
    }
  });
}

