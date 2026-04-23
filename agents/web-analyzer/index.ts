import "dotenv/config";
import { createGroq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { startSeller, fetchPage } from "forge-sdk";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

// Tool to visit and understand the page
const analyzeTool = createTool({
  id: "analyze-webpage",
  description: "Fetch a webpage and provide a high-level understanding of its structure and purpose",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  execute: async ({ context: { url } }) => {
    const content = await fetchPage(url, 15000);
    return { content };
  },
});

const agent = new Agent({
  name: "web-analyzer",
  instructions: `You are a web application analyzer. 
Your goal is to understand a webpage/webapp and provide:
1. A step-by-step overview of what the site does and how it works.
2. A structured JSON summary of the site's key features, metadata, and technical stack (if identifiable).

Use the analyze-webpage tool to see the content first.
Always output the step-by-step overview followed by the JSON summary in a code block.`,
  model,
  tools: {
    "analyze-webpage": analyzeTool,
  },
});

startSeller({
  agentId: "web-analyzer",
  port: Number(process.env.ANALYZER_PORT ?? 4501),
  capabilities: ["analyze website", "understand webapp", "web overview", "json metadata extraction"],
  description: "Analyzes any URL and returns a step-by-step overview and JSON metadata.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
