#!/usr/bin/env tsx
import "dotenv/config";
import { ethers } from "ethers";
import { IdentityClient, CommerceClient, KITE_TESTNET, decrypt, type ForgeConfig } from "forge-sdk";
import { loadWallet, cmdSetup, cmdSetupWait } from "./setup.js";

// ── Config ────────────────────────────────────────────────────────────────────

const SELLER_URLS = (process.env.SELLER_URLS ?? "http://localhost:4501,http://localhost:4502,http://localhost:4503,http://localhost:4504,http://localhost:4505,http://localhost:4506").split(",");

function getConfig(): { cfg: ForgeConfig; signer: ethers.Wallet } {
  const { privateKey } = loadWallet();
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  return { cfg: { signerOrProvider: signer, ...KITE_TESTNET }, signer };
}

// ── Output helpers ────────────────────────────────────────────────────────────

function out(data: unknown) { console.log(JSON.stringify(data, null, 2)); }
function fatal(msg: string): never { console.error(JSON.stringify({ error: msg })); process.exit(1); }

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdList() {
  const results = await Promise.allSettled(
    SELLER_URLS.map((url) => fetch(`${url}/.well-known/agent.json`).then((r) => r.json()).then((m) => ({ ...m, url })))
  );
  out(results.flatMap((r) => r.status === "fulfilled" ? [r.value] : []));
}

async function cmdHire(agentUrl: string, task: string) {
  if (!agentUrl || !task) fatal("Usage: forge hire <agentUrl> \"<task>\"");
  const { cfg, signer } = getConfig();

  const manifest = await fetch(`${agentUrl}/.well-known/agent.json`).then((r) => r.json()).catch(() => fatal(`Cannot reach agent at ${agentUrl}`));
  if (!manifest.wallet) fatal("Agent manifest missing wallet address");

  const identity = new IdentityClient(cfg);
  try { await identity.register("ipfs://buyer.json"); } catch { /* already registered */ }

  const commerce = new CommerceClient(cfg);
  const budget = BigInt(process.env.JOB_BUDGET_WEI ?? "1000000");
  const evaluator = cfg.validatorConsensusContract || signer.address;
  const jobId = await commerce.createJob(manifest.wallet, evaluator, KITE_TESTNET.usdcToken, budget, task);

  const buyerPubKey = signer.signingKey.publicKey;
  await fetch(`${agentUrl}/job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: jobId.toString(), task, buyer_pubkey: buyerPubKey }),
  });

  out({ jobId: jobId.toString(), agent: manifest.name, task, status: "Funded", evaluator });
}

async function cmdStatus(jobId: string) {
  if (!jobId) fatal("Usage: forge status <jobId>");
  const { cfg } = getConfig();
  const job = await new CommerceClient(cfg).getJob(BigInt(jobId));
  out({ ...job, id: job.id.toString(), budget: job.budget.toString() });
}

async function cmdResult(jobId: string) {
  if (!jobId) fatal("Usage: forge result <jobId>");
  const { cfg } = getConfig();
  const { privateKey } = loadWallet();
  const job = await new CommerceClient(cfg).getJob(BigInt(jobId));
  if (!job.deliverable) fatal("No deliverable yet");
  try {
    out({ jobId, decrypted: true, result: decrypt(privateKey, job.deliverable) });
  } catch {
    out({ jobId, decrypted: false, result: job.deliverable });
  }
}

async function cmdComplete(jobId: string) {
  if (!jobId) fatal("Usage: forge complete <jobId>");
  const { cfg } = getConfig();
  await new CommerceClient(cfg).complete(BigInt(jobId));
  out({ jobId, status: "Completed" });
}

async function cmdCancel(jobId: string) {
  if (!jobId) fatal("Usage: forge cancel <jobId>");
  const { cfg } = getConfig();
  await new CommerceClient(cfg).cancel(BigInt(jobId));
  out({ jobId, status: "Cancelled" });
}

// ── Router ────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

const commands: Record<string, () => Promise<void>> = {
  setup:    () => args[0] === "--wait" ? cmdSetupWait() : cmdSetup(),
  list:     () => cmdList(),
  hire:     () => cmdHire(args[0], args[1]),
  status:   () => cmdStatus(args[0]),
  result:   () => cmdResult(args[0]),
  complete: () => cmdComplete(args[0]),
  cancel:   () => cmdCancel(args[0]),
};

if (!cmd || !commands[cmd]) {
  console.log(JSON.stringify({
    usage: "forge <command> [args]",
    commands: {
      setup:    "forge setup [--wait] — create buyer wallet, optionally wait for USDC funding",
      list:     "forge list — discover available seller agents",
      hire:     "forge hire <agentUrl> \"<task>\" — create escrow job and send task",
      status:   "forge status <jobId> — check job status",
      result:   "forge result <jobId> — fetch and decrypt deliverable",
      complete: "forge complete <jobId> — manually release payment to seller",
      cancel:   "forge cancel <jobId> — cancel job and get refund",
    },
  }, null, 2));
  process.exit(0);
}

commands[cmd]().catch((e) => fatal(e.message));
