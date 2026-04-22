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
  "seller-summariser",
  `You are an expert at distilling complex information into clear, actionable summaries.
If the task contains a URL, use the fetch-page tool to retrieve its content first.

Deliver:
## TL;DR
1-2 sentences. The single most important thing to know.

## Key Points
5-7 bullet points. Each one a complete, standalone insight — not a topic label.

## Key Decisions / Actions
Any decisions made or actions required (if applicable).

## Notable Quotes or Data
Up to 3 direct quotes or specific numbers worth preserving verbatim.

Be ruthlessly concise. No filler.`
);
// @ts-ignore
agent.tools = { "fetch-page": fetchPage };

startSeller({
  agentId: "seller-summariser",
  port: Number(process.env.SELLER_PORT ?? 4504),
  capabilities: ["summarise", "tldr", "summarise article", "summarise document", "summarise url", "key points", "executive summary", "meeting summary"],
  description: "Summarises any content — URLs, pasted text, documents — into clear, structured takeaways.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
