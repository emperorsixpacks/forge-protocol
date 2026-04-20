import "dotenv/config";
import express from "express";
import { ethers } from "ethers";
import { PassportClient, KITE_TESTNET, createLogger } from "forge-sdk";

const log = createLogger("seller-monitor");
const PORT = Number(process.env.SELLER_PORT ?? 4511);
const CHARGE_PER_MIN = BigInt(process.env.CHARGE_PER_MIN_WEI ?? "10000"); // 0.01 USDC/min default

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
const signer = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
const cfg = { ...KITE_TESTNET, signerOrProvider: signer };

// active monitors: sessionId → interval handle
const monitors = new Map<string, ReturnType<typeof setInterval>>();

const app = express();
app.use(express.json());

const manifest = {
  name: "seller-monitor",
  description: "Monitors a URL or wallet address continuously. Charges per minute via passport spending session.",
  capabilities: ["monitor url", "watch wallet", "uptime check", "price alert", "balance alert"],
  price_usdc: "0.01/min",
  wallet: signer.address,
  endpoint: `http://localhost:${PORT}`,
};

app.get("/", (_req, res) => res.json(manifest));
app.get("/.well-known/agent.json", (_req, res) => res.json(manifest));

// POST /monitor — start a monitoring session
// body: { sessionId, target, type: "url"|"wallet", alertWebhook? }
app.post("/monitor", async (req, res) => {
  const { sessionId, target, type = "url", alertWebhook } = req.body;
  if (!sessionId || !target) return res.status(400).json({ error: "sessionId and target required" });
  if (monitors.has(sessionId)) return res.json({ status: "already_running", sessionId });

  log.info("monitor_started", { sessionId, target, type });
  res.json({ status: "started", sessionId, target, chargePerMin: CHARGE_PER_MIN.toString() });

  const passport = new PassportClient(cfg);

  const handle = setInterval(async () => {
    try {
      // check remaining session budget
      const remaining = await passport.remaining(BigInt(sessionId));
      if (remaining < CHARGE_PER_MIN) {
        log.info("session_exhausted", { sessionId });
        clearInterval(handle);
        monitors.delete(sessionId);
        return;
      }

      // do the check
      let alert: string | null = null;
      if (type === "url") {
        const start = Date.now();
        const r = await fetch(target, { signal: AbortSignal.timeout(5000) }).catch(() => null);
        const ms = Date.now() - start;
        if (!r || !r.ok) alert = `DOWN: ${target} returned ${r?.status ?? "no response"} (${ms}ms)`;
        else log.info("url_ok", { target, status: r.status, ms });
      } else if (type === "wallet") {
        const balance = await provider.getBalance(target);
        log.info("wallet_balance", { target, balance: balance.toString() });
        if (balance === 0n) alert = `ALERT: wallet ${target} balance is 0`;
      }

      // charge for this minute
      await passport.spend(BigInt(sessionId), signer.address, CHARGE_PER_MIN);
      log.info("charged", { sessionId, amount: CHARGE_PER_MIN.toString() });

      // fire alert webhook if triggered
      if (alert && alertWebhook) {
        await fetch(alertWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, alert, target, ts: Date.now() }),
        }).catch(() => {});
        log.info("alert_sent", { alert });
      }
    } catch (err) {
      log.error("monitor_error", { sessionId, error: (err as Error).message });
    }
  }, 60_000); // every 60 seconds

  monitors.set(sessionId, handle);
});

// DELETE /monitor/:sessionId — stop monitoring
app.delete("/monitor/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const handle = monitors.get(sessionId);
  if (handle) { clearInterval(handle); monitors.delete(sessionId); }
  res.json({ status: "stopped", sessionId });
});

// GET /monitor/:sessionId — status
app.get("/monitor/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const running = monitors.has(sessionId);
  const passport = new PassportClient(cfg);
  const remaining = await passport.remaining(BigInt(sessionId)).catch(() => 0n);
  res.json({ sessionId, running, remaining: remaining.toString() });
});

app.listen(PORT, () => log.info("monitor_started", { port: PORT, wallet: signer.address }));
