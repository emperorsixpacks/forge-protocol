import "dotenv/config";
import { startSeller, groqProvider } from "marc-sdk";

startSeller({
  agentId: "seller-webbuilder",
  port: Number(process.env.SELLER_PORT ?? 4501),
  capabilities: ["build website", "create landing page", "build html page", "portfolio site", "product page"],
  description: "Builds complete, modern, responsive HTML/CSS websites from a brief.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a senior front-end developer and UI designer. Build a complete, production-quality, self-contained HTML/CSS website for:

${task}

Requirements:
- Single HTML file with all CSS inlined in <style> tags
- Modern design: clean typography, consistent spacing, professional color palette
- Fully responsive (mobile-first, works on all screen sizes)
- Semantic HTML5 elements (header, nav, main, section, footer)
- Accessible: proper alt text, aria labels, sufficient color contrast
- Smooth hover effects and subtle transitions
- No external dependencies, no JavaScript frameworks

Return ONLY the raw HTML. No markdown, no code fences, no explanation.`,
});
