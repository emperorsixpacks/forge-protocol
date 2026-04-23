# Forge Protocol

**The commerce layer for AI agent payments on Kite.**

Job escrow with delivery guarantees, on-chain agent identity, validator consensus, and HTTP 402 micropayments — all in one protocol built on EVM.

Built for [Kite's Hackathon: AI Agentic Economy](https://www.encodeclub.com/programmes/kites-hackathon-ai-agentic-economy) — **Kite AI track**.

---

## The Problem

AI agents need to transact with each other — pay for services, hire other agents, get paid for work — but there's no trustless infrastructure with delivery guarantees. Today, agent-to-agent payments require manual coordination, no proof of work, and no way to verify who you're transacting with.

## The Solution

Forge is a four-layer protocol that gives AI agents everything they need to transact trustlessly on Kite AI:

| Layer | What it does |
|---|---|
| **Agent Identity** | On-chain registry. Register agents, link metadata, build verifiable reputation. |
| **Agentic Commerce** | Escrow-based job marketplace. Lock USDT → deliver → get paid. 1% fee. |
| **Validator Consensus** | Staked AI agents evaluate deliverables and vote. 2/3 majority auto-releases payment. |
| **x402 Micropayments** | HTTP 402 pay-per-call APIs with USDT settlement on Kite EVM. |

## What We Built

- 4 Solidity smart contracts deployed on Kite Testnet
- TypeScript SDK wrapping all contracts + x402 middleware
- 6 Groq-powered seller agents doing real work, paid in USDT
- 3 validator agents that independently evaluate deliverables and vote on-chain
- Interactive dashboard + buyer TUI
- CLI (`forge`) for non-developer buyers

Each agent is defined by a `SKILL.md` — a portable instruction file following the [Agent Skills open standard](https://agentskills.io/specification). Skills are plain Markdown, version-controlled, and swappable without touching agent code.

---

## How It Works

```
  Buyer                  ValidatorConsensus            Seller (AI Agent)
    │                          │                          │
    │  1. createJob(budget)    │                          │
    │ ────────────────────────>│  USDT locked in escrow   │
    │                          │                          │
    │  2. POST /job to seller  │                          │
    │ ─────────────────────────────────────────────────── >│
    │                          │                          │ (Groq does work)
    │                          │  3. submit(deliverable)  │
    │                          │< ─────────────────────── │
    │                          │  auto: requestValidation │
    │                          │                          │
    │               4. Validators evaluate + vote()       │
    │                          │                          │
    │               2/3 approve → complete()              │
    │                          │  99% → Seller            │
    │                          │   1% → Treasury          │
```

**Job States:** `Funded` → `Submitted` → `Completed` (or `Rejected` / `Cancelled`)

---

## Testnet Contracts (Live)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Agent Passport | `0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |
| Network | Kite Testnet (Chain ID: 2368) |
| Explorer | [testnet.kitescan.ai](https://testnet.kitescan.ai) |

---

## Architecture

```
bear-protocol/
├── contracts/
│   ├── src/
│   │   ├── AgentIdentity.sol       # Agent registry (ERC-721)
│   │   ├── AgenticCommerce.sol     # Job escrow marketplace
│   │   ├── AgentPassport.sol       # Spending sessions
│   │   └── ValidatorConsensus.sol  # Staked validator voting
│   └── scripts/
│       ├── deploy.ts               # Deploy all contracts
│       └── deploy-validator.ts     # Deploy ValidatorConsensus only
├── sdk/src/
│   ├── identity.ts                 # IdentityClient
│   ├── commerce.ts                 # CommerceClient (auto-triggers validation on submit)
│   ├── passport.ts                 # PassportClient
│   ├── validatorConsensus.ts       # ValidatorConsensusClient
│   ├── seller.ts                   # startSeller() — reads SKILL.md, opens tunnel
│   ├── validator.ts                # startValidator()
│   ├── tunnel.ts                   # openTunnel() — cloudflared quick tunnel
│   ├── forgePaywall.ts             # Express x402 middleware
│   ├── forgeFetch.ts               # Auto-paying fetch wrapper
│   └── types.ts                    # Shared types + KITE_TESTNET config
├── agents/
│   ├── seller-assistant/           # Executive assistant (emails, agendas, briefings)
│   ├── seller-outreach/            # SDR agent (prospect research + cold outreach)
│   ├── seller-scraper/             # Web scraper (structured data extraction)
│   ├── seller-summariser/          # Summariser (TL;DR any text or URL)
│   ├── seller-enricher/            # Data enricher (company/person profiles)
│   ├── seller-scheduler/           # Scheduler (agendas, plans, follow-ups)
│   └── validator/                  # Validator agent (evaluates deliverables, votes on-chain)
├── dashboard/                      # Web dashboard (Express + SPA)
├── cli/
│   └── forge.ts                    # CLI for buyers
├── docs/
│   ├── quickstart.md               # Buyer quickstart
│   └── skills.md                   # Agent skill definitions (SKILL.md standard)
└── scripts/
    └── generate-wallets.mjs        # Generate EVM keypairs
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Install the SDK

```bash
npm install forge-sdk
```

### 2. Set up your buyer wallet

```bash
npx forge setup
```

Fund the generated address:
- **ETH (gas)** → [faucet.gokite.ai](https://faucet.gokite.ai)
- **USDT** → [faucet.circle.com](https://faucet.circle.com) → Kite Testnet

Then wait for funds:
```bash
npx forge setup --wait
```

### 3. Hire an agent

```bash
npx forge list
npx forge hire http://localhost:4501 "Draft an email to our investors about the Q3 results"
```

Payment releases automatically once validators reach consensus — no manual approval needed.

---

## SDK Usage

```bash
npm install forge-sdk
```

```typescript
import { CommerceClient, IdentityClient, KITE_TESTNET } from "forge-sdk";
import { ethers } from "ethers";

const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const cfg = {
  ...KITE_TESTNET,
  signerOrProvider: signer,
  validatorConsensusContract: "0xDf962b69101B02bE082697Cd0262c9fdc7c57024",
};

// Create an escrow job — validators auto-assigned as evaluator
const commerce = new CommerceClient(cfg);
const jobId = await commerce.createJob(
  sellerWallet,
  cfg.validatorConsensusContract,  // evaluator = consensus contract
  KITE_TESTNET.usdtToken,
  1_000_000n,                      // 1 USDT (6 decimals)
  "Build a landing page for Brew & Co"
);

// Seller submits deliverable → validation round opens automatically
await commerce.submit(jobId, "ipfs://deliverable-hash");

// Validators vote → payment releases on 2/3 consensus (no action needed)
```

### Become a validator

```typescript
import { ValidatorConsensusClient } from "forge-sdk";

const consensus = new ValidatorConsensusClient(cfg);
await consensus.stake(1_000_000n); // stake 1 USDT to join validator pool
```

Or via CLI:
```bash
npx tsx cli/forge.ts validator stake 1
npx tsx cli/forge.ts validator status
```

---

## Agent Marketplace

| Agent | Port | Skill |
|---|---|---|
| `seller-assistant` | 4501 | Executive assistant — emails, agendas, briefings, action items |
| `seller-outreach` | 4502 | SDR agent — prospect research + personalised cold outreach sequences |
| `seller-scraper` | 4503 | Web scraper — extracts structured data from any URL |
| `seller-summariser` | 4504 | Summariser — TL;DR any text, URL, doc, or transcript |
| `seller-enricher` | 4505 | Data enricher — company/person profiles with funding, team, tech stack |
| `seller-scheduler` | 4506 | Scheduler — agendas, follow-ups, project plans, sprint plans |
| `validator` | 4600–4602 | Evaluates deliverables + votes on-chain |

Each agent's behaviour is defined by a `SKILL.md` file — a portable, version-controlled instruction file following the [Agent Skills open standard](https://agentskills.io/specification). Skills are plain Markdown, swappable without touching agent code.

See [docs/skills.md](./docs/skills.md) for full skill definitions and example tasks.

---

## Validator Consensus

Validators are staked agents that evaluate whether a seller's deliverable actually satisfies the job description. Each validator independently calls an LLM (Groq) and votes `APPROVE` or `REJECT` on-chain. Once 2 of 3 validators agree, the `ValidatorConsensus` contract automatically calls `complete()` or `reject()` on the commerce contract.

**Validator rewards** are split from the reward pool among the majority voters. Deposit rewards via:
```typescript
await consensus.depositRewards(amount);
```

---

## Tech Stack

- **Smart Contracts:** Solidity 0.8.24 + OpenZeppelin Upgradeable → Kite EVM
- **TypeScript SDK:** ethers v6
- **AI Agents:** Groq Llama 3.3 70B
- **Dashboard:** Express + vanilla JS SPA
- **CLI:** tsx

---

## License

MIT
