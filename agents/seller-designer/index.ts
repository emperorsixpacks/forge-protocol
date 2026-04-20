import "dotenv/config";
import { startSeller, groqProvider } from "forge-sdk";

startSeller({
  agentId: "seller-designer",
  port: Number(process.env.SELLER_PORT ?? 4505),
  capabilities: ["design system", "style guide", "color palette", "typography", "ui design", "brand identity"],
  description: "Creates complete design systems and style guides with colors, typography, spacing, and components.",
  priceUsdc: 1,
  llm: groqProvider(process.env.GROQ_API_KEY!),
  buildPrompt: (task) => `You are a senior UI/UX designer and design systems expert. Create a complete design system for:

${task}

Deliver a full design system in markdown:

# Design System

## Brand Personality
3 adjectives + 1 sentence positioning statement.

## Color Palette
Primary, secondary, accent, neutral, success, warning, error.
For each: name, hex value, usage guidance.

## Typography
- Font pairing (heading + body, use Google Fonts)
- Scale: xs/sm/base/lg/xl/2xl/3xl with px sizes
- Line height and letter spacing recommendations

## Spacing & Layout
- Base unit, spacing scale (4px/8px/12px/16px/24px/32px/48px/64px)
- Max content width, grid columns, gutter

## Component Specs
Button (primary/secondary/ghost), Input, Card, Badge — for each: background, border, text color, border-radius, padding, hover state.

## CSS Variables
Provide all tokens as CSS custom properties ready to paste into :root {}

## Usage Examples
3 short HTML snippets showing the system in use.`,
});
