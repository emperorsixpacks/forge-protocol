import "dotenv/config";
import { startValidator } from "forge-sdk";
import { createGroq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

const agent = new Agent({ name: "forge-validator", model });

startValidator({
  port: Number(process.env.VALIDATOR_PORT ?? 4600),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
  stakeAmount: BigInt(process.env.STAKE_AMOUNT_WEI ?? "1000000000000000"), // 0.001 KITE — matches contract minStake
  evaluate: async (prompt) => {
    const { text } = await agent.generate([{ role: "user", content: prompt }]);
    const approve = text.trim().toUpperCase().startsWith("APPROVE");
    return { approve, reason: text.trim() };
  },
});
