import "dotenv/config";
import express from "express";

const PORT = Number(process.env.REGISTRY_PORT ?? 3001);
const TTL_MS = Number(process.env.REGISTRY_TTL_MS ?? 60_000); // 60s — agent must heartbeat within this

interface AgentEntry {
  agentId: string;
  url: string;
  description: string;
  capabilities: string[];
  priceUsdt: number;
  wallet: string;
  lastSeen: number;
}

const agents = new Map<string, AgentEntry>();

const app = express();
app.use(express.json());

// Seller registers / heartbeats
app.post("/register", (req, res) => {
  const { agentId, url, description, capabilities, priceUsdt, wallet } = req.body;
  if (!agentId || !url) return res.status(400).json({ error: "agentId and url required" });
  agents.set(agentId, { agentId, url, description, capabilities, priceUsdt, wallet, lastSeen: Date.now() });
  res.json({ ok: true });
});

// Buyers query live agents
app.get("/agents", (_req, res) => {
  const now = Date.now();
  const live = [...agents.values()]
    .filter((a) => now - a.lastSeen < TTL_MS)
    .map(({ lastSeen: _, ...a }) => a);
  res.json(live);
});

app.get("/", (_req, res) => res.json({ service: "forge-registry", agents: agents.size }));

app.listen(PORT, () => console.log(JSON.stringify({ event: "registry_started", port: PORT, ttl_ms: TTL_MS })));
