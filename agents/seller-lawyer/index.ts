import "dotenv/config";
import { startSeller, groqProvider, webSearch, AgentMemory, runSubAgents } from "forge-sdk";

const memory = new AgentMemory("seller-lawyer");

startSeller({
  agentId: "seller-lawyer",
  port: Number(process.env.SELLER_PORT ?? 4509),
  capabilities: ["contract draft", "terms of service", "privacy policy", "nda", "legal review", "compliance", "ip agreement", "saas agreement"],
  description: "Drafts legal documents — contracts, ToS, privacy policies, NDAs — tailored to your jurisdiction and use case.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: async (task) => {
    const past = memory.recent(3).map(m => `- ${m.key}: ${String(m.value).slice(0, 100)}`).join("\n");

    const searches = await runSubAgents([
      { name: "legal_context", run: () => webSearch(`${task} legal requirements clauses standard`, 3).then(r => r.map(x => x.snippet).join("\n")) },
      { name: "regulations",   run: () => webSearch(`${task} regulation compliance GDPR law`, 3).then(r => r.map(x => x.snippet).join("\n")) },
    ]);

    memory.set(task.slice(0, 60), searches.legal_context.slice(0, 200));

    return `You are a senior commercial lawyer specialising in technology and startup law.

TASK: ${task}

LEGAL CONTEXT FROM RESEARCH:
[Standard Clauses & Requirements] ${searches.legal_context || "none"}
[Regulatory Considerations] ${searches.regulations || "none"}
${past ? `\nPREVIOUS DOCUMENTS CONTEXT:\n${past}` : ""}

Draft a complete, professional legal document. Include:
- Clear section headings and numbered clauses
- Definitions section for all key terms
- All standard protective clauses for this document type
- Jurisdiction and governing law clause
- Signature blocks

Add a brief [LEGAL NOTE] at the top: "This document is AI-generated for reference purposes. Have it reviewed by a qualified lawyer before use."

Write the full document — do not truncate or summarise.`;
  },
});
