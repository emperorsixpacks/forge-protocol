import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { KITE_TESTNET } from "forge-sdk";
import { provider, cfg } from "./lib/config.js";
import {
  getAllAgents,
  getAllJobs,
  getValidators,
  getRoundStatus,
  invalidateAgents,
  invalidateJobs,
  commerce,
} from "./lib/discovery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use("/app", express.static(path.join(__dirname, "public")));

// Serialize bigint → string for JSON
function serial(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(serial);
  if (typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serial(val)])
    );
  }
  return v;
}

const STATUS_NAMES = ["Funded", "Submitted", "Completed", "Rejected", "Cancelled"];

function formatJob(j: Awaited<ReturnType<typeof commerce.getJob>>) {
  return {
    id: j.id.toString(),
    client: j.client,
    provider: j.provider,
    evaluator: j.evaluator,
    token: j.token,
    budget: j.budget.toString(),
    status: STATUS_NAMES[Number(j.status)] ?? String(j.status),
    description: j.description,
    deliverable: j.deliverable,
  };
}

// GET /api/stats
app.get("/api/stats", async (_req, res) => {
  try {
    const [agents, jobs, feeBps] = await Promise.all([
      getAllAgents(),
      getAllJobs(),
      commerce.feeBps().catch(() => 100),
    ]);
    const activeJobs = jobs.filter((j) => Number(j.status) < 2).length;
    res.json({ totalAgents: agents.length, totalJobs: jobs.length, activeJobs, feeBps });
  } catch (e: any) { res.status(500).json({ error: e.message || String(e) }); }
});

// GET /api/agents
app.get("/api/agents", async (_req, res) => {
  try {
    res.json(serial(await getAllAgents()));
  } catch (e: any) { res.status(500).json({ error: e.message || String(e) }); }
});

// GET /api/jobs
app.get("/api/jobs", async (req, res) => {
  try {
    let jobs = await getAllJobs();
    const { status } = req.query as { status?: string };
    if (status && status !== "All") {
      const idx = STATUS_NAMES.indexOf(status);
      if (idx !== -1) jobs = jobs.filter((j) => Number(j.status) === idx);
    }
    res.json(jobs.map(formatJob));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/validators
app.get("/api/validators", async (_req, res) => {
  try {
    res.json(serial(await getValidators()));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/validators/round/:jobId
app.get("/api/validators/round/:jobId", async (req, res) => {
  try {
    const round = await getRoundStatus(BigInt(req.params.jobId));
    res.json({
      open: round.open,
      approvals: round.approvals.toString(),
      rejections: round.rejections.toString(),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/balance/:address
app.get("/api/balance/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    const ERC20 = ["function balanceOf(address) view returns (uint256)"];
    const usdt = new ethers.Contract(KITE_TESTNET.usdtToken, ERC20, provider);
    const [eth, usdtBal] = await Promise.all([
      provider.getBalance(addr),
      usdt.balanceOf(addr),
    ]);
    res.json({
      address: addr,
      eth: ethers.formatEther(eth),
      usdt: ethers.formatUnits(usdtBal, 18),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SPA fallback
app.get("/app/*", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const PORT = Number(process.env.DASHBOARD_PORT ?? 3000);
app.listen(PORT, () =>
  console.log(`Forge Dashboard → http://localhost:${PORT}/app`)
);
