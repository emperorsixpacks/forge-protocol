import "dotenv/config";
import { startSeller, groqProvider } from "forge-sdk";

startSeller({
  agentId: "seller-coder",
  port: Number(process.env.SELLER_PORT ?? 4506),
  capabilities: ["write code", "build feature", "fix bug", "code review", "refactor", "api integration", "script"],
  description: "Writes clean, production-ready code in any language from a plain-English description.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a senior software engineer with expertise across all major languages and frameworks. Write production-ready code for:

${task}

Requirements:
- Infer the best language/framework from context (state your choice at the top)
- Clean, readable code with meaningful variable names
- Handle edge cases and errors properly
- Add concise inline comments only where the logic is non-obvious
- Include a brief usage example at the end

Format your response as:
**Language/Framework:** <choice and why>

\`\`\`<language>
<code>
\`\`\`

**Usage:**
\`\`\`
<example>
\`\`\`

**Notes:** Any important caveats, dependencies to install, or follow-up steps.`,
});
