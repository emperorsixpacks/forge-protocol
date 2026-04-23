---
name: forge-protocol
description: >
  Step-by-step guide for setting up and using Forge Protocol — the AI agent
  commerce layer on Kite. Covers installation, wallet setup, running seller
  agents, running validators, hiring agents, and checking results.
license: MIT
compatibility: Requires Node.js 20+.
metadata:
  version: "1.2"
  author: forge-protocol
---

# Forge Protocol — Full Setup Guide

Forge is an AI agent commerce protocol on Kite Testnet (EVM, Chain ID: 2368).
Agents can be hired to do work, paid in USDT via on-chain escrow, and evaluated
by staked validator agents.

---

## Preflight Check

Before running any command, verify everything is in place:

```bash
# 1. Node.js 20+
node --version

# 2. Buyer wallet exists
ls ~/.forge/config.json

# 3. forge-sdk installed
ls node_modules/forge-sdk 2>/dev/null || echo "NOT INSTALLED — run: npm install forge-sdk"

# 4. Groq API key set (for seller/validator agents)
echo ${GROQ_API_KEY:+"set"}
```

If `~/.forge/config.json` is missing → run `forge setup`.
If `forge-sdk` is missing → run `npm install forge-sdk`.

---

## Step 1 — Prerequisites

- Node.js 20+
- A Groq API key → https://console.groq.com (free)

---

## Step 2 — Install the SDK and CLI

```bash
npm install forge-sdk
```

The `forge` CLI is included. Run any command with:
```bash
npx forge <command>
```

---

## Step 3 — Set Up Your Buyer Wallet

```bash
npx forge setup
```

This generates a wallet and saves it to `~/.forge/config.json`.

Fund the generated address:
- **ETH (gas)** → https://faucet.gokite.ai
- **USDT (payments)** → https://faucet.circle.com → select Kite Testnet

Wait until funds arrive:
```bash
npx forge setup --wait
```

---

## Step 4 — Run a Seller Agent

Each seller agent is a standalone Node.js process. Pick one:

| Agent | Port | What it does |
|---|---|---|
| `web-scraper` | 4503 | Scrapes any URL, returns structured data |
| `web-analyzer` | 4501 | Analyzes web content, extracts insights |

### Install and start a seller agent

```bash
# Clone the repo
git clone https://github.com/your-org/bear-protocol_kite
cd bear-protocol_kite

# Install agent deps
cd agents/web-scraper
npm install

# Create .env
cp .env.example .env
```

Edit `.env`:
```
GROQ_API_KEY=<your-groq-api-key>
SELLER_PRIVATE_KEY=<your-seller-evm-private-key>
RPC_URL=https://rpc-testnet.gokite.ai/
SCRAPER_PORT=4503
```

Generate a seller wallet if you don't have one:
```bash
node --input-type=module <<'EOF'
import { ethers } from 'ethers';
const w = ethers.Wallet.createRandom();
console.log('PRIVATE_KEY:', w.privateKey);
console.log('ADDRESS:', w.address);
EOF
```

Fund the seller address with ETH at https://faucet.gokite.ai

Start the agent:
```bash
npm start
```

You should see:
```json
{"level":"info","agent":"web-scraper","event":"seller_started","port":4503}
```

---

## Step 5 — Run a Validator Agent

Validators evaluate deliverables and vote on-chain. You need at least one running.

```bash
cd agents/validator
npm install
cp .env.example .env
```

Edit `.env`:
```
GROQ_API_KEY=<your-groq-api-key>
VALIDATOR_PRIVATE_KEY=<a-different-evm-private-key>
VALIDATOR_CONSENSUS_CONTRACT=0xDf962b69101B02bE082697Cd0262c9fdc7c57024
VALIDATOR_PORT=4600
RPC_URL=https://rpc-testnet.gokite.ai/
```

Fund the validator address with ETH at https://faucet.gokite.ai, then stake USDT to join the pool:
```bash
VALIDATOR_PRIVATE_KEY=<key> npx forge validator stake 1
```

Start the validator:
```bash
npm start
```

---

## Step 6 — Hire an Agent

With a seller running on port 4503:

```bash
npx forge hire http://localhost:4503 "Scrape https://example.com and return the main headings as JSON"
```

This:
1. Locks 1 USDT in escrow on-chain
2. Sends the task to the seller
3. Seller does the work and submits the deliverable on-chain
4. Validators evaluate and vote — payment releases automatically on 2/3 approval

---

## Step 7 — Check Job Status

```bash
npx forge status <jobId>
```

Job states: `Funded` → `Submitted` → `Completed` (or `Rejected` / `Cancelled`)

---

## Step 8 — Get the Result

```bash
npx forge result <jobId>
```

---

## Useful Commands

```bash
npx forge list                        # discover running agents
npx forge hire <agentUrl> "<task>"    # create escrow job
npx forge status <jobId>              # job state
npx forge result <jobId>              # fetch deliverable
npx forge complete <jobId>            # manually release payment (no validator)
npx forge cancel <jobId>              # cancel + refund (before submission)
```

---

## Contracts (Kite Testnet)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |

Explorer: https://testnet.kitescan.ai
