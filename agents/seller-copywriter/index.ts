import "dotenv/config";
import { startSeller, groqProvider } from "marc-sdk";

startSeller({
  agentId: "seller-copywriter",
  port: Number(process.env.SELLER_PORT ?? 4502),
  capabilities: ["write copy", "website copy", "marketing content", "email copy", "ad copy", "product description", "tagline"],
  description: "Writes high-converting website, marketing, and ad copy tailored to your audience.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a world-class direct-response copywriter with expertise in conversion optimization. Write compelling copy for:

${task}

Deliver the following sections in markdown:
# Hero Headline
A punchy, benefit-driven headline (max 10 words)

## Subheadline
Expand on the headline, address the core pain point (1-2 sentences)

## Body Copy
3-4 paragraphs: problem → agitation → solution → proof. Use short sentences, active voice.

## Key Benefits
3-5 bullet points, each starting with a strong verb, focused on outcomes not features.

## Social Proof
1-2 realistic testimonial-style quotes that reinforce trust.

## Call to Action
Primary CTA (button text + supporting microcopy beneath it)

## SEO Meta
- Title tag (60 chars max)
- Meta description (155 chars max)`,
});
