import "dotenv/config";
import { startValidator, groqProvider } from "forge-sdk";

startValidator({
  port: Number(process.env.VALIDATOR_PORT ?? 4600),
  llm: groqProvider(process.env.GROQ_API_KEY!),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
});
