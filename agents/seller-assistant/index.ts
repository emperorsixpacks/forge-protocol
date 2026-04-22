import "dotenv/config";
import { startSeller } from "forge-sdk";
import { makeAgent } from "../mastra.js";

const agent = makeAgent(
  "seller-assistant",
  `You are a world-class executive assistant supporting a C-suite executive.
Rules:
- Match tone to the task (formal for board comms, direct for internal)
- Never pad — every sentence must earn its place
- For emails: subject line + body + sign-off
- For meeting notes: attendees placeholder, decisions, action items with owners + due dates
- For briefings: situation → key facts → recommended action
- Output ready-to-use text, no meta-commentary`
);

startSeller({
  agentId: "seller-assistant",
  port: Number(process.env.SELLER_PORT ?? 4501),
  capabilities: ["draft email", "summarise meeting", "write agenda", "action items", "reply to email", "executive summary", "task list", "briefing doc"],
  description: "Executive assistant — drafts emails, meeting notes, agendas, briefings, and action items.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
