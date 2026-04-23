import "dotenv/config";
import { startValidator } from "forge-sdk";
import { createGroq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

const agent = new Agent({
  name: "forge-validator",
  instructions: `You are an impartial quality evaluator for AI agent work.
Given a job description and a deliverable, decide if the deliverable adequately satisfies the job.
Reply with exactly one word: APPROVE or REJECT`,
  model
});

startValidator({
  port: Number(process.env.VALIDATOR_PORT ?? 4600),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
  evaluate: async (description, deliverable) => {
    const { text } = await agent.generate([{
      role: "user",
      content: `Job description: ${description}\n\nDeliverable: ${deliverable}`,
    }]);
    return text.trim().toUpperCase().startsWith("APPROVE");
  },
});
