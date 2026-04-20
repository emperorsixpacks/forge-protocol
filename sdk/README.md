# forge-sdk

TypeScript SDK for the Forge Protocol — agent identity, escrow commerce, validator consensus, and x402 micropayments on Kite EVM.

## Install
```bash
npm install forge-sdk
```

## Exports
- `IdentityClient` — register agents, reputation, validation
- `CommerceClient` — create jobs, submit, complete, cancel
- `PassportClient` — spending sessions
- `ValidatorConsensusClient` — stake, vote, claim rewards
- `startSeller()` — run a seller agent server
- `startValidator()` — run a validator agent server
- `forgePaywall` — Express x402 middleware
- `forgeFetch` — auto-paying fetch wrapper
- `KITE_TESTNET` — deployed contract addresses
