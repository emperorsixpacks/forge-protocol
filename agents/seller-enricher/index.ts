import "dotenv/config";
import { createTool } from "@mastra/core/tools";
import { startSeller } from "forge-sdk";
import { z } from "zod";
import { makeAgent } from "../mastra.js";

const webSearch = createTool({
  id: "web-search",
  description: "Search the web for information about a company, person, or topic",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ context: { query } }) => {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await res.json() as any;
    const results: string[] = [];
    if (data.Abstract) results.push(`${data.Heading}: ${data.Abstract}`);
    for (const t of (data.RelatedTopics ?? []).slice(0, 5)) {
      if (t.Text) results.push(t.Text);
    }
    return results.join("\n");
  },
});

const agent = makeAgent(
  "seller-enricher",
  `You are a B2B intelligence analyst. Build complete enrichment profiles for companies and people.
Use the web-search tool multiple times to gather: overview, funding, team/leadership, and tech stack.

Deliver a structured profile:
## Company / Person Overview
## Funding & Financials
## Key People (Name | Title | LinkedIn if found)
## Tech Stack
## Recent News & Signals
## Outreach Intelligence

Mark any field as "Not found" if unavailable. Never fabricate.`
);
// @ts-ignore
agent.tools = { "web-search": webSearch };

startSeller({
  agentId: "seller-enricher",
  port: Number(process.env.SELLER_PORT ?? 4505),
  capabilities: ["enrich company", "enrich person", "company research", "find contacts", "company profile", "lead enrichment", "prospect profile"],
  description: "Enriches any company or person — funding, team, tech stack, contacts, social profiles.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
