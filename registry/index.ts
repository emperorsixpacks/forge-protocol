import "dotenv/config";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const PORT = Number(process.env.REGISTRY_PORT ?? 3001);
const TTL_MS = Number(process.env.REGISTRY_TTL_MS ?? 60_000); // 60s — agent must heartbeat within this

interface AgentEntry {
  agentId: string;
  url: string;
  description: string;
  capabilities: string[];
  priceUsdt: number;
  wallet: string;
  agentNftId?: string;
  lastSeen: number;
}

const agents = new Map<string, AgentEntry>();

const app = express();
app.use(express.json());

// Seller registers / heartbeats
app.post("/register", (req, res) => {
  const { agentId, url, description, capabilities, priceUsdt, wallet, agentNftId } = req.body;
  if (!agentId || !url) return res.status(400).json({ error: "agentId and url required" });
  const existing = agents.get(agentId);
  agents.set(agentId, { agentId, url, description, capabilities, priceUsdt, wallet, lastSeen: Date.now(),
    agentNftId: agentNftId ?? existing?.agentNftId });
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

// Validators resolve wallet → agentNftId
app.get("/agents/by-wallet/:wallet", (req, res) => {
  const entry = [...agents.values()].find((a) => a.wallet.toLowerCase() === req.params.wallet.toLowerCase());
  if (!entry) return res.status(404).json({ error: "not found" });
  res.json({ agentNftId: entry.agentNftId ?? null });
});

app.get("/", (_req, res) => res.json({ service: "forge-registry", agents: agents.size }));

// Seller calls this after submitting on-chain — broadcasts jobId to all connected validators
app.post("/notify", (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: "jobId required" });
  const msg = JSON.stringify({ jobId: String(jobId) });
  let count = 0;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) { client.send(msg); count++; }
  }
  console.log(JSON.stringify({ event: "notify_sent", jobId, validators: count }));
  res.json({ ok: true, notified: count });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log(JSON.stringify({ event: "validator_connected", total: wss.clients.size }));
  ws.on("close", () => console.log(JSON.stringify({ event: "validator_disconnected", total: wss.clients.size })));
});

server.listen(PORT, () => console.log(JSON.stringify({ event: "registry_started", port: PORT, ttl_ms: TTL_MS })));
