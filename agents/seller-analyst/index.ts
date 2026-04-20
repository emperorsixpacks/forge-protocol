import "dotenv/config";
import { startSeller, groqProvider, webSearch, AgentMemory, runSubAgents } from "forge-sdk";

const memory = new AgentMemory("seller-analyst");

startSeller({
  agentId: "seller-analyst",
  port: Number(process.env.SELLER_PORT ?? 4507),
  capabilities: ["financial analysis", "market sizing", "competitor breakdown", "data analysis", "business case", "roi analysis", "swot"],
  description: "Produces data-driven financial and market analysis with tables, sizing estimates, and investment recommendations.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: async (task) => {
    const past = memory.recent(3).map(m => `- ${m.key}: ${String(m.value).slice(0, 100)}`).join("\n");

    const searches = await runSubAgents([
      { name: "market_size",   run: () => webSearch(`${task} market size revenue TAM 2024`, 4).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "competitors",   run: () => webSearch(`${task} top companies valuation funding`, 4).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "trends",        run: () => webSearch(`${task} growth rate forecast trends`, 3).then(r => r.map(x => x.snippet).join("\n")) },
    ]);

    memory.set(task.slice(0, 60), searches.market_size.slice(0, 200));

    return `You are a senior financial and market analyst.

TASK: ${task}

LIVE DATA:
[Market Size & Revenue] ${searches.market_size || "none"}
[Competitors & Funding] ${searches.competitors || "none"}
[Growth & Trends] ${searches.trends || "none"}
${past ? `\nPREVIOUS ANALYSIS CONTEXT:\n${past}` : ""}

Produce a rigorous analysis:
# Executive Summary
# Market Sizing (TAM/SAM/SOM with estimates)
# Competitive Landscape (comparison table: company, revenue, funding, strengths)
# Financial Projections (3-year scenario: bear/base/bull)
# SWOT Analysis (2x2 table)
# Key Metrics to Track (5-7 KPIs with benchmarks)
# Investment / Go-Forward Recommendation

Use real numbers from the data. Show your reasoning for estimates.`;
  },
});
