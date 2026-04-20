import "dotenv/config";
import { startSeller, groqProvider } from "marc-sdk";

startSeller({
  agentId: "seller-namer",
  port: Number(process.env.SELLER_PORT ?? 4503),
  capabilities: ["brand naming", "generate names", "name suggestions", "startup name", "product name", "domain name"],
  description: "Generates creative, memorable brand names with taglines and domain suggestions.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a brand strategist and naming expert who has named hundreds of successful companies. Generate brand names for:

${task}

Provide 12 names across 3 categories:

## Invented / Abstract (4 names)
Unique coined words with strong phonetics (e.g. Kodak, Xerox, Notion)

## Descriptive / Compound (4 names)
Clear, memorable combinations that hint at the value (e.g. Dropbox, Mailchimp)

## Evocative / Metaphor (4 names)
Names that evoke a feeling or concept (e.g. Amazon, Apple, Stripe)

For each name provide:
- **Name** — one-line rationale
- Tagline: a 5-7 word tagline
- Domain: likely .com availability (available / taken / check)

End with a **Top Pick** and why.`,
});
