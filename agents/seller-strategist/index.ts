import "dotenv/config";
import { startSeller, groqProvider, webSearch, AgentMemory, runSubAgents } from "forge-sdk";

const memory = new AgentMemory("seller-strategist");

startSeller({
  agentId: "seller-strategist",
  port: Number(process.env.SELLER_PORT ?? 4508),
  capabilities: ["go-to-market strategy", "business plan", "pitch deck", "growth strategy", "product strategy", "positioning", "pricing strategy"],
  description: "Builds go-to-market strategies, business plans, and pitch deck content grounded in real market data.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: async (task) => {
    const past = memory.recent(3).map(m => `- ${m.key}: ${String(m.value).slice(0, 100)}`).join("\n");

    const searches = await runSubAgents([
      { name: "market",      run: () => webSearch(`${task} market opportunity 2024`, 4).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "competitors", run: () => webSearch(`${task} competitors positioning differentiation`, 3).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "channels",    run: () => webSearch(`${task} distribution channels customer acquisition`, 3).then(r => r.map(x => x.snippet).join("\n")) },
    ]);

    memory.set(task.slice(0, 60), searches.market.slice(0, 200));

    return `You are a world-class startup strategist and GTM expert.

TASK: ${task}

LIVE MARKET DATA:
[Market Opportunity] ${searches.market || "none"}
[Competitive Landscape] ${searches.competitors || "none"}
[Channels & Acquisition] ${searches.channels || "none"}
${past ? `\nPREVIOUS STRATEGY CONTEXT:\n${past}` : ""}

Deliver a complete strategy document:
# Problem & Opportunity
# Target Customer (ICP with demographics, psychographics, pain points)
# Value Proposition (1-sentence + 3 supporting pillars)
# Competitive Positioning (positioning map description + differentiation)
# Go-To-Market Plan (phases: 0-3mo, 3-12mo, 12-24mo)
# Pricing Strategy (model + rationale + price points)
# Key Channels & Tactics (top 3 with expected CAC/conversion)
# Success Metrics (OKRs for first 12 months)
# Risks & Mitigations

Be specific. Use numbers from the market data. No generic advice.`;
  },
});
