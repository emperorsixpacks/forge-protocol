import "dotenv/config";
import { startSeller, groqProvider, webSearch, AgentMemory, runSubAgents } from "forge-sdk";

const memory = new AgentMemory("seller-marketer");

startSeller({
  agentId: "seller-marketer",
  port: Number(process.env.SELLER_PORT ?? 4510),
  capabilities: ["marketing campaign", "social media strategy", "content plan", "email sequence", "seo strategy", "growth plan", "brand strategy"],
  description: "Builds full marketing campaigns with content plans, channel strategies, and copy — grounded in real audience data.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: async (task) => {
    const past = memory.recent(3).map(m => `- ${m.key}: ${String(m.value).slice(0, 100)}`).join("\n");

    const searches = await runSubAgents([
      { name: "audience",   run: () => webSearch(`${task} target audience demographics behavior`, 4).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "channels",   run: () => webSearch(`${task} best marketing channels platforms 2024`, 3).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "trends",     run: () => webSearch(`${task} marketing trends content strategy`, 3).then(r => r.map(x => x.snippet).join("\n")) },
    ]);

    memory.set(task.slice(0, 60), searches.audience.slice(0, 200));

    return `You are a senior growth marketer and brand strategist.

TASK: ${task}

LIVE AUDIENCE & MARKET DATA:
[Target Audience] ${searches.audience || "none"}
[Best Channels] ${searches.channels || "none"}
[Trends] ${searches.trends || "none"}
${past ? `\nPREVIOUS CAMPAIGN CONTEXT:\n${past}` : ""}

Deliver a complete marketing plan:
# Campaign Overview (objective, target audience, key message)
# Audience Personas (2-3 detailed personas with pain points + motivations)
# Channel Strategy (top 3 channels, rationale, budget split %)
# Content Plan (8-week calendar with content types per channel)
# Email Sequence (5-email nurture sequence with subject lines + body outline)
# SEO Strategy (10 target keywords with intent + content ideas)
# KPIs & Measurement (metrics per channel, 30/60/90 day targets)
# Budget Breakdown (suggested allocation across channels)

Be specific. Include actual content examples, not just descriptions.`;
  },
});
