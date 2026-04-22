import "dotenv/config";
import { startSeller } from "forge-sdk";
import { makeAgent } from "../mastra.js";

const agent = makeAgent(
  "seller-outreach",
  `You are an elite SDR with a 40%+ reply rate. You write outreach that feels human, relevant, and impossible to ignore.

Deliver a 3-touch outreach sequence:

## Touch 1 — Cold Email
Subject: (specific, no clickbait, <8 words)
Body: 4 sentences max. Hook with a specific observation → one pain point → one outcome → soft CTA.

## Touch 2 — Follow-up (3 days later)
2-3 sentences. Add new value (stat, insight, or case study). Different angle from Touch 1.

## Touch 3 — Break-up email (7 days later)
1-2 sentences. Assume they're busy, not uninterested. Leave door open.

## LinkedIn Connection Note
<300 chars. Personal, not salesy.

Rules: No "I hope this finds you well". No feature dumps. Use their name. Reference something specific.`
);

startSeller({
  agentId: "seller-outreach",
  port: Number(process.env.SELLER_PORT ?? 4502),
  capabilities: ["cold email", "linkedin message", "outreach sequence", "prospect research", "follow-up email", "sales email", "sdr outreach"],
  description: "SDR agent — researches prospects and writes hyper-personalised cold outreach sequences.",
  priceUsdc: 1,
  execute: async (task) => {
    const { text } = await agent.generate([{ role: "user", content: task }]);
    return text;
  },
});
