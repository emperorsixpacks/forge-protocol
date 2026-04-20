# MARC on Stellar

**The commerce layer for AI agent payments on Stellar.**

Job escrow with delivery guarantees, on-chain agent identity, and HTTP 402 micropayments — all in one protocol built on Soroban.

Built for [Stellar Hacks: Agents 2026](https://stellarhacks.com) — **x402 x Stripe MPP track**.

---

## The Problem

AI agents need to transact with each other — pay for services, hire other agents, get paid for work — but there's no trustless infrastructure for this on Stellar. Today, agent-to-agent payments require manual coordination, no delivery guarantees, and no way to verify who you're transacting with.

## The Solution

MARC is a three-layer protocol that gives AI agents everything they need to transact trustlessly:

| Layer | What it does | Standard |
|---|---|---|
| **Agent Identity** | On-chain registry. Register, link metadata, build verifiable reputation. | ERC-8004 |
| **Agentic Commerce** | Escrow-based job marketplace. Lock funds → deliver → get paid. 1% fee. | ERC-8183 |
| **x402 Micropayments** | HTTP 402 pay-per-call APIs via Stellar payment rails. | x402 + MPP |

## What We Built

- 2 Soroban smart contracts (Rust → WASM, deployed on testnet)
- 19 contract unit tests (7 identity + 12 commerce)
- TypeScript SDK wrapping both contracts + x402 middleware
- Interactive dashboard (register agents, create jobs, full escrow lifecycle)
- Multi-agent TUI simulation (4 sellers + 5 buyers running concurrently)
- Real AI agent marketplace — 4 Groq-powered seller agents doing real work, paid in USDC

---

## How It Works

```
  Buyer                     Contract                   Seller (AI Agent)
    │                          │                          │
    │  1. create_job(budget)   │                          │
    │ ────────────────────────>│  USDC locked in escrow   │
    │                          │                          │
    │  2. POST /job to seller  │                          │
    │ ────────────────────────────────────────────────────>│
    │                          │                          │ (Groq LLM does work)
    │                          │  3. submit(deliverable)  │
    │                          │<─────────────────────────│
    │                          │                          │
    │  4. complete()           │                          │
    │ ────────────────────────>│  99% → Seller            │
    │                          │   1% → Treasury          │
```

**Job States:** `Funded` → `Submitted` → `Completed` (or `Cancelled` from `Funded`)

---

## Testnet Contracts (Live)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Network | Kite Testnet (Chain ID: 2368) |
| Explorer | [testnet.kitescan.ai](https://testnet.kitescan.ai) |

---

## Architecture

```
bear-protocol/
├── contracts/
│   ├── agent-identity/       # Soroban contract — agent registry
│   └── agentic-commerce/     # Soroban contract — job escrow
├── sdk/                      # TypeScript SDK
│   └── src/
│       ├── identity.ts       # IdentityClient
│       ├── commerce.ts       # CommerceClient
│       ├── marcPaywall.ts    # Express x402 middleware
│       ├── marcFetch.ts      # Auto-paying fetch wrapper
│       └── types.ts          # Shared types + TESTNET config
├── agents/                   # AI agent marketplace
│   ├── buyer/                # Buyer TUI — browse agents, hire, pay
│   ├── seller-webbuilder/    # Builds HTML websites (Groq)
│   ├── seller-copywriter/    # Writes website copy (Groq)
│   ├── seller-namer/         # Generates brand names (Groq)
│   ├── seller-researcher/    # Writes research reports (Groq)
│   └── registry/             # Local agent manifest server
├── demo/
│   ├── tui.ts                # Multi-agent TUI simulation
│   ├── buyer-agent.ts        # Buyer lifecycle script
│   └── seller-agent.ts       # Seller x402 paywall server
├── dashboard/                # Web dashboard (Express + SPA)
└── scripts/
    ├── build.sh              # Build contracts + SDK
    └── deploy-testnet.sh     # Deploy to Stellar testnet
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.92+ (for contract builds only)
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A funded Stellar testnet keypair

### 1. Clone & build SDK

```bash
git clone https://github.com/mmhhmm/marc-stellar.git
cd marc-stellar
cd sdk && npm install && npm run build && cd ..
```

### 2. Set up environment

```bash
cp demo/.env.example demo/.env
```

Fill in `demo/.env`:
```
BUYER_SECRET=S...          # funded testnet keypair
SELLER_SECRET_1=S...       # seller-webbuilder keypair
SELLER_SECRET_2=S...       # seller-copywriter keypair
SELLER_SECRET_3=S...       # seller-namer keypair
SELLER_SECRET_4=S...       # seller-researcher keypair
GROQ_API_KEY=gsk_...       # from console.groq.com
X402_FACILITATOR_API_KEY=  # from: curl https://channels.openzeppelin.com/testnet/gen
```

Generate funded testnet keypairs:
```bash
stellar keys generate buyer --network testnet --fund
stellar keys show buyer  # copy the S... secret
```

Fund buyer with USDC at [faucet.circle.com](https://faucet.circle.com) → Stellar Testnet.

### 3. Start the agent marketplace

```bash
./start-agents.sh
```

This starts:
- Agent registry on `:4500`
- 4 seller agents on `:4501–4504`

### 4. Run the buyer TUI

```bash
cd agents/buyer && npm start
```

- `↑↓` to browse agents
- `Tab` to focus task input
- Type your task, press `Enter` to hire
- Press `n` to start a new task

### 5. Run the dashboard

```bash
cd dashboard && npm install && npx tsx server.ts
```

Open [http://localhost:3000/app](http://localhost:3000/app) to see all on-chain agents and jobs.

### 6. Run the TUI simulation (optional)

```bash
cd demo && npm run tui
```

Runs 4 sellers + 5 buyers concurrently, showing live balances and activity.

---

## SDK Usage

```typescript
import { IdentityClient, CommerceClient, TESTNET } from "marc-stellar-sdk";

const cfg = {
  ...TESTNET,
  onTx: (hash) => console.log(`tx: https://stellar.expert/explorer/testnet/tx/${hash}`),
};

// Register an agent on-chain
const identity = new IdentityClient(cfg);
const agentId = await identity.register(keypair, "ipfs://agent-metadata.json");

// Browse registered agents
const agents = await identity.listAgents();

// Create an escrow job (locks USDC)
const commerce = new CommerceClient(cfg);
const jobId = await commerce.createJob(
  clientKeypair,
  providerAddress,
  evaluatorAddress,
  TESTNET.usdcToken,
  10_000_000n, // 1 USDC (7 decimals)
  "Build a landing page for Brew & Co coffee shop"
);

// Provider submits deliverable
await commerce.submit(providerKeypair, jobId, "ipfs://deliverable-hash");

// Evaluator approves → 99% to provider, 1% to treasury
await commerce.complete(evaluatorKeypair, jobId);
```

### x402 Paywall (seller side)

```typescript
import { marcPaywall } from "marc-stellar-sdk";

app.use("/api/work", marcPaywall({
  payTo: seller.publicKey(),
  price: "$0.01",
  network: "stellar:testnet",
  facilitatorApiKey: process.env.X402_FACILITATOR_API_KEY,
}));
```

### x402 Auto-pay (buyer side)

```typescript
import { marcFetch } from "marc-stellar-sdk";

const paidFetch = marcFetch({ signer: keypair, rpcUrl: TESTNET.rpcUrl });
const res = await paidFetch("http://seller-agent/api/work");
```

---

## Contract API Reference

### Agent Identity

| Function | Auth | Description |
|---|---|---|
| `register(agent, uri)` | agent | Register agent, returns sequential ID |
| `get_agent(id)` | — | Get agent by ID |
| `agent_of(address)` | — | Lookup agent ID by Stellar address |
| `update_uri(id, uri)` | owner | Update metadata URI |
| `deregister(id)` | owner | Remove agent from registry |

### Agentic Commerce

| Function | Auth | Description |
|---|---|---|
| `init(admin, treasury)` | admin | One-time setup (1% fee, sequential IDs) |
| `create_job(client, provider, evaluator, token, budget, desc)` | client | Lock USDC in escrow |
| `submit(job_id, deliverable)` | provider | Submit work result URI |
| `complete(job_id)` | evaluator | Release 99% to provider, 1% to treasury |
| `cancel(job_id)` | client | Refund full budget (only from Funded) |
| `fee_bps()` | — | Current fee in basis points |
| `set_fee_bps(bps)` | admin | Update fee (max 5%) |
| `set_treasury(addr)` | admin | Update treasury address |

---

## Agent Marketplace

The `agents/` directory contains a working AI agent marketplace built on MARC:

| Agent | Port | Capability | Model |
|---|---|---|---|
| `seller-webbuilder` | 4501 | Builds HTML websites | Groq Llama 3.3 70B |
| `seller-copywriter` | 4502 | Writes website copy | Groq Llama 3.3 70B |
| `seller-namer` | 4503 | Generates brand names | Groq Llama 3.3 70B |
| `seller-researcher` | 4504 | Writes research reports | Groq Llama 3.3 70B |

Each seller exposes:
- `GET /` — returns `agent.json` capability manifest
- `POST /job` — accepts `{ jobId, task }`, calls Groq, submits deliverable on-chain

The buyer TUI (`agents/buyer`) discovers sellers via the local registry, creates MARC escrow jobs, notifies the seller, and releases payment on delivery.

---

## Testing

```bash
# Soroban contract tests (19 total)
cargo test

# SDK type check
cd sdk && npx tsc --noEmit
```

---

## Tech Stack

- **Smart Contracts:** Rust + Soroban SDK 25.3.1 → WASM
- **TypeScript SDK:** @stellar/stellar-sdk 14.6.1 + @x402/express
- **AI Agents:** Groq SDK (Llama 3.3 70B)
- **Dashboard:** Express + vanilla JS SPA
- **Standards:** ERC-8004 (Agent Identity), ERC-8183 (Agentic Commerce), x402, MPP

---

## Team

Built by [@mmhhmm](https://github.com/mmhhmm)

## License

MIT
