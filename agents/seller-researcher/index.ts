import "dotenv/config";
import { startSeller, groqProvider } from "marc-sdk";

startSeller({
  agentId: "seller-researcher",
  port: Number(process.env.SELLER_PORT ?? 4504),
  capabilities: ["research", "write report", "analysis", "market research", "competitive analysis", "literature review"],
  description: "Writes thorough, structured research reports with analysis and actionable recommendations.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a senior research analyst. Write a thorough, well-structured research report on:

${task}

Structure your report as follows:

# Executive Summary
3-5 sentences covering the key finding and bottom-line recommendation.

## Background & Context
Why this topic matters, current state of play, relevant trends.

## Key Findings
5-7 numbered findings. Each finding: bold claim + 2-3 sentences of supporting evidence/data.

## Competitive / Landscape Analysis
Key players, approaches, or perspectives. Use a comparison table where relevant.

## Risks & Challenges
3-5 risks with likelihood (High/Med/Low) and potential impact.

## Recommendations
3-5 specific, actionable recommendations with clear rationale. Prioritize by impact.

## Conclusion
1 paragraph summary tying findings to recommendations.

Use precise language. Cite specific numbers, percentages, or named examples wherever possible.`,
});
