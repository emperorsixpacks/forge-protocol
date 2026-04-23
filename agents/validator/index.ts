import "dotenv/config";
import { startValidator } from "forge-sdk";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

startValidator({
  port: Number(process.env.VALIDATOR_PORT ?? 4600),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
  stakeAmount: BigInt(process.env.STAKE_AMOUNT_WEI ?? "1000000000000000"),
  evaluate: async (prompt) => {
    const { text } = await generateText({ model, prompt });
    const approve = text.trim().toUpperCase().startsWith("APPROVE");
    return { approve, reason: text.trim() };
  },
});
