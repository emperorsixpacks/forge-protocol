import { createGroq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";

export const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const model = groq("llama-3.3-70b-versatile");

export function makeAgent(name: string, instructions: string) {
  return new Agent({ name, instructions, model });
}
