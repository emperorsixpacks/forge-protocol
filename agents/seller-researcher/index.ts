import "dotenv/config";
import { startSeller, groqProvider, webSearch, AgentMemory, runSubAgents } from "forge-sdk";

const memory = new AgentMemory("seller-researcher");

startSeller({
  agentId: "seller-researcher",
  port: Number(process.env.SELLER_PORT ?? 4504),
  capabilities: ["research", "write report", "market research", "competitive analysis", "literature review", "deep dive"],
  description: "Researches any topic using live web search and writes a structured, cited report.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: async (task) => {
    const past = memory.recent(3).map(m => `- ${m.key}: ${String(m.value).slice(0, 100)}`).join("\n");

    const searches = await runSubAgents([
      { name: "overview",    run: () => webSearch(task, 4).then(r => r.map(x => `${x.title}: ${x.snippet}`).join("\n")) },
      { name: "news",        run: () => webSearch(`${task} 2024 2025`, 3).then(r => r.map(x => `${x.title}: ${x.snippet}`).join("\n")) },
      { name: "players",     run: () => webSearch(`${task} companies market players`, 3).then(r => r.map(x => `${x.title}: ${x.snippet}`).join("\n")) },
    ]);

    memory.set(task.slice(0, 60), searches.overview.slice(0, 200));

    return `You are a senior research analyst with live web data.

TASK: ${task}

LIVE SEARCH DATA:
[Overview] ${searches.overview || "none"}
[News] ${searches.news || "none"}
[Market Players] ${searches.players || "none"}
${past ? `\nPREVIOUS RESEARCH CONTEXT:\n${past}` : ""}

Write a comprehensive report:
# Executive Summary
# Background & Context
# Key Findings (5-7 numbered with evidence)
# Market Landscape (table of key players)
# Risks & Challenges (High/Med/Low)
# Recommendations (3-5 actionable)
# Conclusion

Cite search results. Use precise numbers and named examples.`;
  },
});
