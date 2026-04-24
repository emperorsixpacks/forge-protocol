import { IdentityClient, CommerceClient, ValidatorConsensusClient } from "forge-sdk";
import type { Agent, Job } from "forge-sdk";
import { cfg, KNOWN_VALIDATORS } from "./config.js";

export const identity = new IdentityClient(cfg);
export const commerce = new CommerceClient(cfg);
export const consensus = new ValidatorConsensusClient(cfg);

// Simple TTL caches
let agentCache: { data: Agent[]; ts: number } = { data: [], ts: 0 };
let jobCache: { data: Job[]; ts: number } = { data: [], ts: 0 };
const TTL = 5_000;

// Raw throwing getters for findMaxId (getAgent/getJob swallow errors internally)
async function rawGetAgent(id: bigint): Promise<void> {
  const owner = await (identity as any).contract.ownerOf(id);
  if (!owner) throw new Error("not found");
}
async function rawGetJob(id: bigint): Promise<void> {
  const j = await (commerce as any).contract.getJob(id);
  if (!j || j.client === "0x0000000000000000000000000000000000000000") throw new Error("not found");
}

async function findMaxId(rawGetter: (id: bigint) => Promise<void>): Promise<number> {
  let probe = 1;
  while (probe <= 2048) {
    try { await rawGetter(BigInt(probe)); probe *= 2; }
    catch { break; }
  }
  if (probe === 1) return 0; // nothing at id=1
  let lo = Math.floor(probe / 2), hi = probe;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    try { await rawGetter(BigInt(mid)); lo = mid; }
    catch { hi = mid - 1; }
  }
  return lo;
}

async function fetchAll<T>(max: number, getter: (id: bigint) => Promise<T | null>): Promise<T[]> {
  const results: T[] = [];
  for (let i = 1; i <= max; i += 10) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(10, max - i + 1) }, (_, k) => getter(BigInt(i + k)))
    );
    for (const item of batch) if (item !== null) results.push(item as T);
  }
  return results;
}

export async function getAllAgents(force = false): Promise<Agent[]> {
  if (!force && Date.now() - agentCache.ts < TTL) return agentCache.data;
  const max = await findMaxId(rawGetAgent);
  const agents = await fetchAll(max, (id) => identity.getAgent(id));
  agentCache = { data: agents, ts: Date.now() };
  return agents;
}

export async function getAllJobs(force = false): Promise<Job[]> {
  if (!force && Date.now() - jobCache.ts < TTL) return jobCache.data;
  const max = await findMaxId(rawGetJob);
  const jobs = await fetchAll(max, (id) => commerce.getJob(id));
  jobCache = { data: jobs, ts: Date.now() };
  return jobs;
}

export async function getValidators() {
  const [count, minStake] = await Promise.all([
    consensus.validatorCount(),
    consensus.minStake(),
  ]);
  const stakes = await Promise.all(
    KNOWN_VALIDATORS.map(async (addr) => ({
      address: addr,
      staked: (await consensus.stakedAmount(addr)).toString(),
    }))
  );
  return { count: count.toString(), minStake: minStake.toString(), validators: stakes };
}

export async function getRoundStatus(jobId: bigint) {
  return consensus.roundStatus(jobId);
}

export function invalidateAgents() { agentCache.ts = 0; }
export function invalidateJobs() { jobCache.ts = 0; }
