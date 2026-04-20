#!/usr/bin/env node
/**
 * Generates fresh EVM keypairs for all seller agents.
 * Uses only Node built-ins — no dependencies required.
 *
 * Usage: node scripts/generate-wallets.mjs
 */
import { randomBytes, createHash } from "node:crypto";

// Minimal secp256k1 public key + EVM address derivation using Node crypto
// We use the SubtleCrypto API available in Node 18+
const agents = [
  { name: "seller-webbuilder",  port: 4501, envVar: "SELLER_SECRET_1" },
  { name: "seller-copywriter",  port: 4502, envVar: "SELLER_SECRET_2" },
  { name: "seller-namer",       port: 4503, envVar: "SELLER_SECRET_3" },
  { name: "seller-researcher",  port: 4504, envVar: "SELLER_SECRET_4" },
  { name: "seller-designer",    port: 4505, envVar: "SELLER_SECRET_5" },
  { name: "seller-coder",       port: 4506, envVar: "SELLER_SECRET_6" },
  { name: "validator-1",        port: 4600, envVar: "VALIDATOR_SECRET_1" },
  { name: "validator-2",        port: 4601, envVar: "VALIDATOR_SECRET_2" },
  { name: "validator-3",        port: 4602, envVar: "VALIDATOR_SECRET_3" },
];

async function deriveAddress(privKeyHex) {
  const keyPair = await globalThis.crypto.subtle.importKey(
    "raw",
    Buffer.from(privKeyHex, "hex"),
    { name: "ECDH", namedCurve: "P-256" }, // Note: P-256 ≠ secp256k1, address will differ from real EVM
    true, ["deriveKey"]
  ).catch(() => null);
  // SubtleCrypto doesn't support secp256k1 — just show the private key, ethers will derive the address at runtime
  return "(address derived at runtime by ethers)";
}

console.log("# ── Generated EVM Wallets ──────────────────────────────────────\n");
console.log("# Add these to your root .env or demo/.env\n");

for (const agent of agents) {
  const privKey = "0x" + randomBytes(32).toString("hex");
  console.log(`# ${agent.name} (port ${agent.port})`);
  console.log(`${agent.envVar}=${privKey}\n`);
}

console.log("# ── Per-agent .env ──────────────────────────────────────────────");
console.log("# Each agent folder needs:");
console.log("#   SELLER_PRIVATE_KEY=<matching secret above>");
console.log("#   GROQ_API_KEY=gsk_...");
console.log("#   RPC_URL=https://rpc-testnet.gokite.ai/");
console.log("#");
console.log("# Fund each address with Kite testnet ETH at https://faucet.gokite.ai");
