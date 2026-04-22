import "dotenv/config";
import { createTool } from "@mastra/core/tools";
import { startSeller } from "forge-sdk";
import { z } from "zod";
import { makeAgent } from "../mastra.js";

const fetchPage = createTool({
  id: "fetch-page",
  description: "Fetch and extract text content from a URL",
  inputSchema: z.object({ url: z.string() }),
  execute: async ({ context: { url } }) => {
    const res = await fetch(url, { headers: { "User-Agent": "forge-agent/1.0" }, signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  },
});

const agent = makeAgent(
  "seller-scraper",
  `You are a data extraction specialist. Extract clean, structured data from web pages.
- Use the fetch-page tool to retrieve any URLs mentioned in the task
- Output as markdown table for list/tabular data, JSON for structured records, bullet list for contacts
- Strip all noise — ads, nav, footers, boilerplate
- If data is missing or page was empty, say so clearly`
);
// @ts-ignore — Mastra tool injection
agent.tools = { "fetch-page": fetchPage };

startSeller({
  agentId: "seller-scraper",
  port: Number(process.env.SELLER_PORT ?? 4503),
  capabilities: ["scrape website", "extract data", "scrape prices", "scrape contacts", "scrape jobs", "extract table", "web data extraction"],
  description: "Scrapes any URL and returns clean structured data — contacts, prices, tables, listings.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
