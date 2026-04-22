#!/usr/bin/env tsx
import "dotenv/config";
import { ethers } from "ethers";
import { IdentityClient, CommerceClient, ValidatorConsensusClient, PassportClient, KITE_TESTNET, decrypt, type ForgeConfig } from "forge-sdk";
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

// ── Validator commands ────────────────────────────────────────────────────────

async function cmdValidatorStake(amount?: string) {
  if (!amount) fatal("Usage: forge validator stake <usdcAmount>");
  const { cfg } = getConfig();
  const wei = ethers.parseUnits(amount, 6); // USDC has 6 decimals on Kite
  await new ValidatorConsensusClient(cfg).stake(wei);
  out({ staked: amount, status: "staked" });
}

async function cmdValidatorUnstake() {
  const { cfg } = getConfig();
  await new ValidatorConsensusClient(cfg).unstake();
  out({ status: "unstaked" });
}

async function cmdValidatorStatus(jobId?: string) {
  const { cfg, signer } = getConfig();
  const client = new ValidatorConsensusClient(cfg);
  if (jobId) {
    const round = await client.roundStatus(BigInt(jobId));
    const voted = await client.hasVoted(BigInt(jobId), signer.address);
    out({ jobId, ...round, approvals: round.approvals.toString(), rejections: round.rejections.toString(), myVote: voted ? "cast" : "pending" });
  } else {
    const staked = await client.stakedAmount(signer.address);
    const count = await client.validatorCount();
    const min = await client.minStake();
    out({ address: signer.address, staked: staked.toString(), validatorCount: count.toString(), minStake: min.toString() });
  }
}

// ── Passport commands ─────────────────────────────────────────────────────────

async function cmdPassportOpen(agentWallet: string, maxUsdc: string, hours: string) {
  if (!agentWallet || !maxUsdc) fatal("Usage: forge passport open <agentWallet> <maxUsdc> [hours=24]");
  const { cfg } = getConfig();
  const maxSpend = ethers.parseUnits(maxUsdc, 6);
  const expiresAt = Math.floor(Date.now() / 1000) + (Number(hours ?? 24) * 3600);
  const sessionId = await new PassportClient(cfg).openSession(agentWallet, KITE_TESTNET.usdcToken, maxSpend, expiresAt);
  out({ sessionId: sessionId.toString(), agentWallet, maxUsdc, expiresAt });
}

async function cmdPassportStatus(sessionId: string) {
  if (!sessionId) fatal("Usage: forge passport status <sessionId>");
  const { cfg } = getConfig();
  const passport = new PassportClient(cfg);
  const session = await passport.getSession(BigInt(sessionId));
  const remaining = await passport.remaining(BigInt(sessionId));
  out({ ...session, maxSpend: session.maxSpend.toString(), spent: session.spent.toString(), remaining: remaining.toString() });
}

async function cmdPassportRevoke(sessionId: string) {
  if (!sessionId) fatal("Usage: forge passport revoke <sessionId>");
  const { cfg } = getConfig();
  await new PassportClient(cfg).revokeSession(BigInt(sessionId));
  out({ sessionId, status: "revoked" });
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
  validator: () => {
    const sub = args[0];
    if (sub === "stake")   return cmdValidatorStake(args[1]);
    if (sub === "unstake") return cmdValidatorUnstake();
    if (sub === "status")  return cmdValidatorStatus(args[1]);
    fatal("Usage: forge validator <stake <amount> | unstake | status [jobId]>");
  },
  passport: () => {
    const sub = args[0];
    if (sub === "open")   return cmdPassportOpen(args[1], args[2], args[3]);
    if (sub === "status") return cmdPassportStatus(args[1]);
    if (sub === "revoke") return cmdPassportRevoke(args[1]);
    fatal("Usage: forge passport <open <agentWallet> <maxUsdc> [hours] | status <sessionId> | revoke <sessionId>>");
  },
};

if (!cmd || !commands[cmd]) {
  console.log(JSON.stringify({
    usage: "forge <command> [args]",
    commands: {
      setup:              "forge setup [--wait] — create buyer wallet, optionally wait for USDC funding",
      "wallet generate":  "forge wallet generate — generate EVM keypairs for all seller + validator agents",
      list:               "Discover available seller agents",
      hire:               "forge hire <agentUrl> \"<task>\" — create escrow job",
      status:             "forge status <jobId> — check job status",
      result:             "forge result <jobId> — fetch + decrypt deliverable",
      complete:           "forge complete <jobId> — release payment to seller",
      cancel:             "forge cancel <jobId> — cancel job + refund",
      "validator stake":  "forge validator stake <usdcAmount> — stake USDC to become a validator",
      "validator unstake":"forge validator unstake — withdraw stake",
      "validator status": "forge validator status [jobId] — show stake info or round status for a job",
    },
  }, null, 2));
  process.exit(0);
}

commands[cmd]().catch((e) => fatal(e.message));
