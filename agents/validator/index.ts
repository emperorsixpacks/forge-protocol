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

Rules:
- Evaluate ONLY what is present in the deliverable. Do not assume data is missing unless the deliverable itself says so.
- APPROVE if the deliverable is a reasonable, good-faith attempt that addresses the job description.
- REJECT only if the deliverable is empty, completely off-topic, or explicitly fails the task.
- Do NOT reject because you think there might be more data — you cannot verify that.

Reply with APPROVE or REJECT followed by one sentence explaining why.`,
  model
});

startValidator({
  port: Number(process.env.VALIDATOR_PORT ?? 4600),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
  stakeAmount: BigInt(process.env.STAKE_AMOUNT_WEI ?? "1000000000000000"), // 0.001 KITE — matches contract minStake
  evaluate: async (description, deliverable) => {
    const { text } = await agent.generate([{
      role: "user",
      content: `Job description: ${description}\n\nDeliverable: ${deliverable}\n\nReply APPROVE or REJECT followed by a one-sentence reason.`,
    }]);
    const approve = text.trim().toUpperCase().startsWith("APPROVE");
    return { approve, reason: text.trim() };
  },
});
