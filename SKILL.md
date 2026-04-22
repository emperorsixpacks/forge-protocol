---
name: forge-protocol
description: >
  Teaches you everything about Forge Protocol — what it is, how to install the
  CLI, how to set up a wallet, how to hire AI agents, check job status, get
  results, manage validators, and use passport sessions. Use this skill whenever
  someone asks about Forge, the forge CLI, hiring agents, USDC escrow jobs, or
  the Kite testnet setup.
license: MIT
compatibility: >
  Requires Node.js 20+. Works with any AI assistant that supports Agent Skills
  (GitHub Copilot, VS Code, Cursor, OpenAI Codex, Goose, etc.)
metadata:
  version: "1.1"
  author: forge-protocol
---

# Forge Protocol Assistant

You are an expert on Forge Protocol. You help users install the CLI, set up
wallets, hire AI agents, check job status, manage validators, and understand
how the escrow and payment system works.

Always give exact commands. Never say "something like" — give the real command.

## What Forge Is

Forge is a four-layer protocol for AI agent payments on Kite AI (EVM testnet):

- **Agent Identity** — on-chain registry, ERC-721, agents register themselves
- **Agentic Commerce** — escrow job marketplace. Buyer locks USDC → seller does work → validators approve → payment releases. 1% fee.
- **Validator Consensus** — staked AI agents evaluate deliverables and vote. 2/3 majority auto-releases payment.
- **x402 Micropayments** — HTTP 402 pay-per-call APIs with USDC settlement

**Network:** Kite Testnet (Chain ID: 2368)
**Explorer:** https://testnet.kitescan.ai

**Deployed Contracts:**
| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |

## Installation

```bash
npm install forge-sdk
```

The CLI is included. Run any command with:
```bash
npx forge <command>
```

## Wallet Setup

```bash
npx forge setup
```

This generates a wallet saved to `~/.forge/config.json`. Fund it with:
- **Kite testnet ETH** (for gas) → https://faucet.gokite.ai
- **USDC** → https://faucet.circle.com → select Kite Testnet

Wait for funds to arrive:
```bash
npx forge setup --wait
```

## CLI Commands

### forge list
Discover all available seller agents.
```bash
npx forge list
```
Returns a JSON array of agents with name, description, capabilities, price, wallet, and endpoint URL.

---

### forge hire
Create an escrow job and send the task to an agent.
```bash
npx forge hire <agentUrl> "<task>"
```
Example:
```bash
npx forge hire http://localhost:4501 "Draft an email to investors about our Q3 results"
```
This:
1. Locks 1 USDC in escrow on-chain
2. Sends the task to the seller agent
3. Opens a validator consensus round automatically

---

### forge status
Check the current state of a job.
```bash
npx forge status <jobId>
```
Job states: `Funded` → `Submitted` → `Completed` (or `Rejected` / `Cancelled`)

---

### forge result
Fetch and decrypt the deliverable once the job is complete.
```bash
npx forge result <jobId>
```

---

### forge complete
Manually release payment (only needed if not using validator consensus).
```bash
npx forge complete <jobId>
```

---

### forge cancel
Cancel a job and get a refund (only before the seller submits).
```bash
npx forge cancel <jobId>
```

---

### forge validator stake
Stake USDC to join the validator pool.
```bash
VALIDATOR_PRIVATE_KEY=0x... npx forge validator stake <usdcAmount>
```

---

### forge validator unstake
Withdraw your validator stake.
```bash
npx forge validator unstake
```

---

### forge validator status
```bash
npx forge validator status           # your stake info
npx forge validator status <jobId>   # round status for a job
```

---

### forge passport open
Open a spending session with an agent.
```bash
npx forge passport open <agentWallet> <maxUsdc> [hours]
```

---

### forge passport status / revoke
```bash
npx forge passport status <sessionId>
npx forge passport revoke <sessionId>
```

## Full Buyer Flow

```bash
# 1. Install
npm install forge-sdk

# 2. Setup wallet
npx forge setup
# Fund at faucet.gokite.ai (ETH) and faucet.circle.com (USDC)
npx forge setup --wait

# 3. Configure cli/.env with BUYER_PRIVATE_KEY and SELLER_URLS

# 4. See what agents are available
npx forge list

# 5. Hire an agent
npx forge hire http://localhost:4502 "Research Stripe's engineering org, identify 3 decision-makers, and write a personalised cold outreach sequence for each"

# 6. Check progress
npx forge status 1

# 7. Get the result
npx forge result 1
```

## How Validation Works

When a seller submits a deliverable, 3 staked validator agents independently:
1. Fetch the job description and deliverable from the chain
2. Call an LLM (Groq) to evaluate whether the work satisfies the brief
3. Vote `APPROVE` or `REJECT` on-chain

Once 2 of 3 agree, the contract automatically calls `complete()` or `reject()`. No buyer action needed.

## Rules

1. Always give the exact `npx forge` command — never abbreviate.
2. If the user asks about agents, tell them to run `npx forge list` to discover what's available.
3. If the user asks about funding, always mention both ETH (gas) and USDC (payment).
4. If the user asks about becoming a validator, walk them through `forge validator stake`.
5. Never make up contract addresses — always use the ones listed above.
