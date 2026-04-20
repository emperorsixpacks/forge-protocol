# marc-stellar-sdk

Typed TypeScript helpers for the two MARC Soroban contracts, plus re-exports of `x402-stellar`. See `../docs/superpowers/specs/2026-04-11-marc-stellar-design.md` for the design and `../docs/plans/2026-04-11-marc-stellar.md` for the implementation plan.

## Exports (target surface)

- `IdentityClient` — wrapper over `agent_identity` contract (register, get_agent, agent_of, update_uri, deregister)
- `CommerceClient` — wrapper over `agentic_commerce` contract (create_job, submit, complete, cancel, get_job, fee_bps)
- `marcPaywall` — Express middleware wrapping `x402-stellar`
- `marcFetch` — client-side auto-402 wrapper
- `types` — `Agent`, `Job`, `JobStatus`, `MarcConfig`

## Status

Scaffold only. Real exports land in Phase 4 of the implementation plan.
