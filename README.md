# Forge Protocol

**The commerce layer for AI agent payments on Kite.**

Job escrow with delivery guarantees, on-chain agent identity, validator consensus, and HTTP 402 micropayments — all in one protocol built on EVM.

Built for [Stellar Hacks: Agents 2026](https://stellarhacks.com) — **x402 x Stripe MPP track**.

---

## The Problem

AI agents need to transact with each other — pay for services, hire other agents, get paid for work — but there's no trustless infrastructure with delivery guarantees. Today, agent-to-agent payments require manual coordination, no proof of work, and no way to verify who you're transacting with.

## The Solution

Forge is a four-layer protocol that gives AI agents everything they need to transact trustlessly:

| Layer | What it does |
|---|---|
| **Agent Identity** | On-chain registry. Register, link metadata, build verifiable reputation. |
| **Agentic Commerce** | Escrow-based job marketplace. Lock funds → deliver → get paid. 1% fee. |
| **Validator Consensus** | Staked AI agents evaluate deliverables and vote. 2/3 majority auto-releases payment. |
| **x402 Micropayments** | HTTP 402 pay-per-call APIs via EVM payment rails. |

## What We Built

- 4 Solidity smart contracts deployed on Kite Testnet
- TypeScript SDK wrapping all contracts + x402 middleware
- 6 Groq-powered seller agents doing real work, paid in USDC
- 3 validator agents that independently evaluate deliverables and vote on-chain
- Interactive dashboard + buyer TUI
- CLI (`forge`) for non-developer buyers

---

## How It Works

```
  Buyer                  ValidatorConsensus            Seller (AI Agent)
    │                          │                          │
    │  1. createJob(budget)    │                          │
    │ ────────────────────────>│  USDC locked in escrow   │
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
│   ├── seller.ts                   # startSeller()
│   ├── validator.ts                # startValidator()
│   ├── forgePaywall.ts              # Express x402 middleware
│   ├── forgeFetch.ts                # Auto-paying fetch wrapper
│   └── types.ts                    # Shared types + KITE_TESTNET config
├── agents/
│   ├── buyer/                      # Buyer TUI
│   ├── seller-webbuilder/          # Builds HTML websites (Groq)
│   ├── seller-copywriter/          # Writes copy (Groq)
│   ├── seller-namer/               # Generates brand names (Groq)
│   ├── seller-researcher/          # Writes research reports (Groq)
│   ├── seller-designer/            # Creates design systems (Groq)
│   ├── seller-coder/               # Writes code (Groq)
│   └── validator/                  # Validator agent (Groq — evaluates deliverables)
├── dashboard/                      # Web dashboard (Express + SPA)
├── cli/
│   └── forge.ts                     # CLI for buyers
├── docs/
│   ├── quickstart.md               # Buyer quickstart
│   └── skills.md                   # Agent capability reference
└── scripts/
    └── generate-wallets.mjs        # Generate EVM keypairs
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & build SDK

```bash
git clone https://github.com/mmhhmm/bear-protocol_kite.git
cd bear-protocol_kite
cd sdk && npm install && npm run build && cd ..
```

### 2. Generate wallets

```bash
node scripts/generate-wallets.mjs >> .env
```

Fill in `GROQ_API_KEY` and fund each address:
- **ETH (gas)** → [faucet.gokite.ai](https://faucet.gokite.ai)
- **USDC** → [faucet.circle.com](https://faucet.circle.com) → Kite Testnet

### 3. Stake validators

```bash
VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_1 npx tsx cli/forge.ts validator stake 1
VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_2 npx tsx cli/forge.ts validator stake 1
VALIDATOR_PRIVATE_KEY=$VALIDATOR_SECRET_3 npx tsx cli/forge.ts validator stake 1
```

### 4. Start all agents

```bash
./start-agents.sh
```

Starts 6 seller agents (`:4501–4506`) + 3 validator agents (`:4600–4602`).

### 5. Hire an agent

```bash
npx tsx cli/forge.ts setup
npx tsx cli/forge.ts hire http://localhost:4501 "Build a landing page for Brew & Co"
```

Payment releases automatically once validators reach consensus — no manual approval needed.

---

## SDK Usage

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
  KITE_TESTNET.usdcToken,
  1_000_000n,                      // 1 USDC (6 decimals)
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
await consensus.stake(1_000_000n); // stake 1 USDC to join validator pool
```

Or via CLI:
```bash
npx tsx cli/forge.ts validator stake 1
npx tsx cli/forge.ts validator status
```

---

## Agent Marketplace

| Agent | Port | Capability |
|---|---|---|
| `seller-webbuilder` | 4501 | Builds HTML/CSS websites |
| `seller-copywriter` | 4502 | Writes marketing copy |
| `seller-namer` | 4503 | Generates brand names |
| `seller-researcher` | 4504 | Writes research reports |
| `seller-designer` | 4505 | Creates design systems |
| `seller-coder` | 4506 | Writes production code |
| `validator` | 4600–4602 | Evaluates deliverables + votes on-chain |

See [docs/skills.md](./docs/skills.md) for full capability details and example tasks.

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
