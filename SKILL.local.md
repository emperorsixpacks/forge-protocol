---
name: forge-protocol-local
description: >
  Buyer guide for Forge Protocol using the local CLI directly via tsx.
  No npm publish needed. For local testing only.
license: MIT
compatibility: Requires Node.js 20+. Repo must be present locally.
metadata:
  version: "1.1"
  author: forge-protocol
---

# Forge Protocol — Local Buyer Guide

Use this when testing locally without publishing the SDK to npm.

---

## Preflight Check

```bash
# 1. Node.js 20+
node --version

# 2. SDK built
ls /home/emperorsixpacks/GitHub/bear-protocol_kite/sdk/dist/index.js \
  2>/dev/null || echo "NOT BUILT — run: cd /home/emperorsixpacks/GitHub/bear-protocol_kite/sdk && npm install && npm run build"

# 3. CLI deps installed
ls /home/emperorsixpacks/GitHub/bear-protocol_kite/cli/node_modules \
  2>/dev/null || echo "NOT INSTALLED — run: cd /home/emperorsixpacks/GitHub/bear-protocol_kite/cli && npm install"

# 4. Buyer wallet exists
ls ~/.forge/config.json 2>/dev/null || echo "NOT FOUND — run: forge setup"
```

Fix anything missing before proceeding.

---

## Step 1 — Install deps (first time only)

```bash
cd /home/emperorsixpacks/GitHub/bear-protocol_kite/sdk && npm install && npm run build && cd ..
cd /home/emperorsixpacks/GitHub/bear-protocol_kite/cli && npm install && cd ..
```

---

## Step 2 — Set Up the CLI Alias

```bash
alias forge="npx tsx /home/emperorsixpacks/GitHub/bear-protocol_kite/cli/forge.ts"
```

Add to `~/.bashrc` or `~/.zshrc` to persist, then `source` it.

---

## Step 3 — Create Your Wallet

```bash
forge setup
```

---

## Step 4 — Fund Your Wallet

Send to the address from Step 3:
- **ETH (gas)** → https://faucet.gokite.ai
- **USDT (payments)** → https://faucet.circle.com → select Kite Testnet

Confirm it arrived:
```bash
forge balance
```

Expected when ready:
```json
{ "address": "0x...", "eth": "0.5", "usdt": "10.0", "ready": true }
```

If `ready` is `false`, wait and run `forge balance` again.

---

## Step 5 — Discover Agents

```bash
forge list
```

---

## Step 6 — Hire an Agent

```bash
forge hire http://localhost:4503 "Scrape https://example.com and return the headings as JSON"
```

---

## Step 7 — Check Status and Get Result

```bash
forge status <jobId>
forge result <jobId>
```

---

## All Commands

```bash
forge setup               # create buyer wallet
forge balance             # check ETH + USDT balance
forge list                # discover available agents
forge hire <url> "<task>" # hire an agent
forge status <jobId>      # check job state
forge result <jobId>      # fetch deliverable
forge complete <jobId>    # manually release payment
forge cancel <jobId>      # cancel + refund
```

---

## Contracts (Kite Testnet, Chain ID: 2368)

| Contract | Address |
|---|---|
| Agent Identity | `0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A` |
| Agentic Commerce | `0xeCee1A2115a5A2c6279Bf88870e658ed813374D0` |
| Validator Consensus | `0xDf962b69101B02bE082697Cd0262c9fdc7c57024` |

Explorer: https://testnet.kitescan.ai
