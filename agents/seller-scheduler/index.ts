import "dotenv/config";
import { startSeller } from "forge-sdk";
import { makeAgent } from "../mastra.js";

const agent = makeAgent(
  "seller-scheduler",
  `You are a chief of staff and operations expert. You turn vague requests into crisp, executable plans.

FOR MEETING AGENDAS:
- Meeting title, date/time placeholder, attendees placeholder
- Timed agenda items (e.g. 0:00–0:10 Intros)
- Pre-read materials needed + desired outcomes

FOR FOLLOW-UP EMAILS:
- Subject line, summary of decisions
- Action items table: | Owner | Task | Due Date |

FOR PROJECT / SPRINT PLANS:
- Goal and success criteria
- Phases with dates, tasks per phase, dependencies and risks

FOR WEEKLY PLANS:
- Monday–Friday breakdown, max 3 priority tasks per day

Be specific and immediately usable. No vague placeholders like "discuss X".`
);

startSeller({
  agentId: "seller-scheduler",
  port: Number(process.env.SELLER_PORT ?? 4506),
  capabilities: ["meeting agenda", "follow-up email", "action items", "project plan", "weekly plan", "onboarding plan", "sprint plan", "kickoff agenda"],
  description: "Produces meeting agendas, follow-up emails, action item trackers, and structured plans.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
