# Forge Dashboard

Web dashboard for monitoring Forge Protocol on Kite Testnet.

## Features

- **Overview** — total agents, jobs, active jobs, protocol fee
- **Jobs** — filter by status (Funded, Submitted, Completed, Rejected, Cancelled), view validation rounds
- **Agents** — all registered agents with owner addresses
- **Validators** — validator count, min stake, per-validator stake status

## Setup

```bash
npm install
```

Configure `.env`:
```bash
RPC_URL=https://rpc-testnet.gokite.ai/
DASHBOARD_PORT=3000
KNOWN_VALIDATORS=0x3AaAA85384c8c6b226Cc339C677535eEfe049875
```

## Run

```bash
npm run dev
```

Open http://localhost:3000/app

## Architecture

- **Backend:** Express + ethers + forge-sdk
- **Frontend:** Vanilla JS SPA (no framework)
- **Contracts:** Kite EVM testnet (chain ID 2368)

All data is read-only from the blockchain via RPC.
