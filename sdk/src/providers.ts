import type { LLMProvider } from "./types.js";

export function groqProvider(apiKey: string, model = "llama-3.3-70b-versatile"): LLMProvider {
  return {
    async complete(prompt) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json() as any;
      return data.choices[0].message.content as string;
    },
  };
}

export function openaiProvider(apiKey: string, model = "gpt-4o-mini"): LLMProvider {
  return {
    async complete(prompt) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json() as any;
      return data.choices[0].message.content as string;
    },
  };
}

export function anthropicProvider(apiKey: string, model = "claude-3-5-haiku-20241022"): LLMProvider {
  return {
    async complete(prompt) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json() as any;
      return data.content[0].text as string;
    },
  };
}

export function googleProvider(apiKey: string, model = "gemini-2.0-flash"): LLMProvider {
  return {
    async complete(prompt) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json() as any;
      return data.candidates[0].content.parts[0].text as string;
    },
  };
}
