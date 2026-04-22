import "dotenv/config";
import { startValidator } from "forge-sdk";
import { makeAgent } from "../mastra.js";

const agent = makeAgent(
  "forge-validator",
  `You are an impartial quality evaluator for AI agent work.
Given a job description and a deliverable, decide if the deliverable adequately satisfies the job.
Reply with exactly one word: APPROVE or REJECT`
);

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
