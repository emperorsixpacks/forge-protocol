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

## Step 1 — Clone and Install

```bash
git clone https://github.com/your-org/bear-protocol_kite
cd bear-protocol_kite
```

Install SDK deps and build it:
```bash
cd sdk
npm install
npm run build
cd ..
```

Install CLI deps:
```bash
cd cli
npm install
cd ..
```

---

## Step 2 — Set Up the Local CLI Alias

Instead of `npx forge`, use:
```bash
alias forge="npx tsx /path/to/bear-protocol_kite/cli/forge.ts"
```

Replace `/path/to/bear-protocol_kite` with the actual path on your machine:
```bash
alias forge="npx tsx $(pwd)/cli/forge.ts"
```

Add it to your `~/.bashrc` or `~/.zshrc` to persist across sessions.

---

## Step 3 — Set Up Your Buyer Wallet

```bash
forge setup
```

Fund the generated address:
- **ETH (gas)** → https://faucet.gokite.ai
- **USDC (payments)** → https://faucet.circle.com → select Kite Testnet

Wait for funds:
```bash
forge setup --wait
```

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
forge hire <agentUrl> "<task>"
forge status <jobId>
forge result <jobId>
forge complete <jobId>
forge cancel <jobId>
```

---

## Running Multiple Agents (separate terminals)

```bash
# Terminal 1
cd agents/web-scraper && npm start

# Terminal 2
cd agents/web-analyzer && npm start

# Terminal 3
cd agents/validator && npm start
```

---

## Contracts (Kite Testnet, Chain ID: 2368)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |

Explorer: https://testnet.kitescan.ai
