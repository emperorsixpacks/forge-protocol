import "dotenv/config";
import { createGroq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { startSeller, fetchPage } from "forge-sdk";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

const scraperTool = createTool({
  id: "fetch-webpage",
  description: "Fetch the text content of a webpage",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  execute: async ({ context: { url } }) => {
    const content = await fetchPage(url, 10000);
    return { content };
  },
});

const agent = new Agent({
  name: "web-scraper",
  instructions: `You are a web scraping specialist. 
Your goal is to extract clean, structured data from the provided URL.
1. Use the fetch-webpage tool to get the content.
2. Clean and format the data according to the user's request (JSON, Markdown, etc.).
3. Remove ads, navigation, and other noise.
If you cannot access the page, explain why.`,
  model,
  tools: {
    "fetch-webpage": scraperTool,
  },
});

startSeller({
  agentId: "web-scraper",
  port: Number(process.env.SCRAPER_PORT ?? 4503),
  capabilities: ["scrape website", "extract data", "web data extraction"],
  description: "Scrapes any URL and returns clean structured data.",
  priceUsdt: 1,
  execute: async (task) => {
    const steps: string[] = [];
    const result = await agent.generate([{ role: "user", content: task }], {
      onStepFinish: (step: any) => {
        if (step.text) console.log(JSON.stringify({ event: "thought", text: step.text.slice(0, 200) }));
        if (step.toolCalls?.length) step.toolCalls.forEach((t: any) =>
          console.log(JSON.stringify({ event: "tool_call", tool: t.toolName, input: t.args }))
        );
        if (step.toolResults?.length) step.toolResults.forEach((t: any) =>
          console.log(JSON.stringify({ event: "tool_result", tool: t.toolName, chars: JSON.stringify(t.result).length }))
        );
      },
    });
    return result.text;
  },
});
