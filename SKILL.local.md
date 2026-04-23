---
name: forge-protocol-local
description: >
  Step-by-step guide for running Forge Protocol from a local clone — no npm
  publish needed. Uses tsx to run the CLI directly. For development and testing.
license: MIT
compatibility: Requires Node.js 20+. Must have the repo cloned locally.
metadata:
  version: "1.0"
  author: forge-protocol
---

# Forge Protocol — Local Dev Setup Guide

Use this when you have the repo cloned and want to run everything locally
without publishing the SDK or CLI to npm.

---

## Preflight Check

Before running any command, verify everything is in place:

```bash
# 1. Node.js 20+
node --version

# 2. SDK built
ls /home/emperorsixpacks/GitHub/bear-protocol_kite/sdk/dist/index.js 2>/dev/null || echo "NOT BUILT — run: cd sdk && npm install && npm run build"

# 3. CLI deps installed
ls /home/emperorsixpacks/GitHub/bear-protocol_kite/cli/node_modules 2>/dev/null || echo "NOT INSTALLED — run: cd cli && npm install"

# 4. Buyer wallet exists
ls ~/.forge/config.json 2>/dev/null || echo "NOT FOUND — run: forge setup"

# 5. Groq API key set (for seller/validator agents)
echo ${GROQ_API_KEY:+"set"}
```

Fix anything missing before proceeding.

---

## Step 1 — Install SDK and CLI deps

```bash
cd /home/emperorsixpacks/GitHub/bear-protocol_kite
cd sdk && npm install && npm run build && cd ..
cd cli && npm install && cd ..
```

---

## Step 2 — Set Up the Local CLI Alias

Add this alias to your shell so you can run `forge` from anywhere:

```bash
alias forge="npx tsx /home/emperorsixpacks/GitHub/bear-protocol_kite/cli/forge.ts"
```

To persist it, add the line above to your `~/.bashrc` or `~/.zshrc`, then reload:
```bash
source ~/.bashrc   # or source ~/.zshrc
```

Verify it works:
```bash
forge
```

---

## Step 3 — Set Up Your Buyer Wallet

```bash
forge setup
```

Fund the generated address:
- **ETH (gas)** → https://faucet.gokite.ai
- **USDT (payments)** → https://faucet.circle.com → select Kite Testnet

Once funded, confirm the wallet is ready:
```bash
forge balance
```

Expected output when ready:
```json
{ "address": "0x...", "eth": "0.5", "usdt": "10.0", "ready": true }
```

If `ready` is `false`, wait and run `forge balance` again until it's `true`.

---

## Step 4 — Run a Seller Agent

```bash
cd agents/web-scraper   # or agents/web-analyzer
npm install
```

Create `.env` (copy from `.env.example` if present):
```
GROQ_API_KEY=<your-groq-api-key>
SELLER_PRIVATE_KEY=<your-seller-evm-private-key>
RPC_URL=https://rpc-testnet.gokite.ai/
SCRAPER_PORT=4503
```

Generate a wallet if needed:
```bash
node --input-type=module <<'EOF'
import { ethers } from '../sdk/node_modules/ethers/dist/ethers.js';
const w = ethers.Wallet.createRandom();
console.log('PRIVATE_KEY:', w.privateKey);
console.log('ADDRESS:', w.address);
EOF
```

Fund the address at https://faucet.gokite.ai, then start:
```bash
npm start
```

Expected output:
```json
{"level":"info","agent":"web-scraper","event":"seller_started","port":4503}
```

---

## Step 5 — Run a Validator Agent

```bash
cd agents/validator
npm install
```

Create `.env`:
```
GROQ_API_KEY=<your-groq-api-key>
VALIDATOR_PRIVATE_KEY=<a-different-evm-private-key>
VALIDATOR_CONSENSUS_CONTRACT=0xDf962b69101B02bE082697Cd0262c9fdc7c57024
VALIDATOR_PORT=4600
RPC_URL=https://rpc-testnet.gokite.ai/
```

Fund the validator address at https://faucet.gokite.ai, then start:
```bash
npm start
```

---

## Step 6 — Hire an Agent

```bash
forge hire http://localhost:4503 "Scrape https://example.com and return the headings as JSON"
```

---

## Step 7 — Check and Retrieve Results

```bash
forge status <jobId>
forge result <jobId>
```

---

## All CLI Commands

```bash
forge list
forge balance                  # check ETH + USDT balance, confirms ready
forge hire <agentUrl> "<task>"
forge status <jobId>
forge result <jobId>
forge complete <jobId>
forge cancel <jobId>
```

## Contracts (Kite Testnet, Chain ID: 2368)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |

Explorer: https://testnet.kitescan.ai
