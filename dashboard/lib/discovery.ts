import { IdentityClient, CommerceClient } from "marc-stellar-sdk";
import type { Agent, Job } from "marc-stellar-sdk";
import { cfg } from "./config.js";

const identity = new IdentityClient(cfg);
const commerce = new CommerceClient(cfg);

// In-memory caches with TTL
let agentCache: { data: Agent[]; ts: number } = { data: [], ts: 0 };
let jobCache: { data: Job[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 3_000; // 3s — fast refresh for demo

/** Find the max existing ID via exponential probe + binary search */
async function findMaxId(
  getter: (id: bigint) => Promise<unknown | null>,
): Promise<number> {
  // Exponential probe
  let probe = 1;
  while (probe <= 1024) {
    const result = await getter(BigInt(probe));
    if (result === null) break;
    probe *= 2;
  }
  // Binary search between probe/2 and probe
  let lo = Math.floor(probe / 2);
  let hi = probe;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const result = await getter(BigInt(mid));
    if (result !== null) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  // Verify lo actually exists
  if (lo >= 1) {
    const check = await getter(BigInt(lo));
    if (check === null) return 0;
  }
  return lo;
}

/** Fetch all items 1..max in parallel batches */
async function fetchAll<T>(
  maxId: number,
  getter: (id: bigint) => Promise<T | null>,
): Promise<T[]> {
  const BATCH = 10;
  const results: T[] = [];
  for (let start = 1; start <= maxId; start += BATCH) {
    const end = Math.min(start + BATCH - 1, maxId);
    const batch = [];
    for (let i = start; i <= end; i++) {
      batch.push(getter(BigInt(i)));
    }
    const items = await Promise.all(batch);
    for (const item of items) {
      if (item !== null) results.push(item);
    }
  }
  return results;
}

export async function getAllAgents(force = false): Promise<Agent[]> {
  if (!force && Date.now() - agentCache.ts < CACHE_TTL) return agentCache.data;
  const max = await findMaxId((id) => identity.getAgent(id));
  const agents = await fetchAll(max, (id) => identity.getAgent(id));
  agentCache = { data: agents, ts: Date.now() };
  return agents;
}

export async function getAllJobs(force = false): Promise<Job[]> {
  if (!force && Date.now() - jobCache.ts < CACHE_TTL) return jobCache.data;
  const max = await findMaxId((id) => commerce.getJob(id));
  const jobs = await fetchAll(max, (id) => commerce.getJob(id));
  jobCache = { data: jobs, ts: Date.now() };
  return jobs;
}

export function invalidateAgents() {
  agentCache.ts = 0;
}
export function invalidateJobs() {
  jobCache.ts = 0;
}

export { identity, commerce };
