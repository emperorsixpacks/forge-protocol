import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Web Search (DuckDuckGo — no API key) ─────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { "User-Agent": "forge-agent/1.0" } });
    const data = await res.json() as any;
    const results: SearchResult[] = [];
    if (data.Abstract) {
      results.push({ title: data.Heading, url: data.AbstractURL, snippet: data.Abstract });
    }
    for (const topic of (data.RelatedTopics ?? []).slice(0, maxResults)) {
      if (topic.Text && topic.FirstURL) {
        results.push({ title: topic.Text.split(" - ")[0], url: topic.FirstURL, snippet: topic.Text });
      }
    }
    return results.slice(0, maxResults);
  } catch {
    return [];
  }
}

// ── Fetch page content ────────────────────────────────────────────────────────

export async function fetchPage(url: string, maxChars = 3000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "forge-agent/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
  } catch {
    return "";
  }
}

// ── PDF generation (HTML → PDF via puppeteer) ─────────────────────────────────

export async function htmlToPdf(html: string): Promise<Buffer> {
  // @ts-ignore
  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer) throw new Error("puppeteer not installed — run: npm install puppeteer");
  const browser = await puppeteer.default.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({ format: "A4", margin: { top: "40px", bottom: "40px", left: "48px", right: "48px" } });
  await browser.close();
  return Buffer.from(pdf);
}

export function markdownToHtml(markdown: string, title = "Report"): string {
  const body = markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#1a1a1a;line-height:1.7}
h1{font-size:2em;border-bottom:2px solid #333;padding-bottom:8px}
h2{font-size:1.4em;margin-top:2em;color:#222}
ul{padding-left:1.5em}li{margin:4px 0}p{margin:0.8em 0}
</style></head><body>${body}</body></html>`;
}

// ── Agent Memory (per-agent JSON file) ────────────────────────────────────────

export class AgentMemory {
  private path: string;
  private data: Record<string, any>;

  constructor(agentId: string) {
    const dir = join(tmpdir(), "forge-agents");
    mkdirSync(dir, { recursive: true });
    this.path = join(dir, `${agentId}-memory.json`);
    this.data = existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {};
  }

  set(key: string, value: any) {
    this.data[key] = { value, ts: Date.now() };
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }

  get(key: string): any {
    return this.data[key]?.value;
  }

  recent(n = 5): Array<{ key: string; value: any; ts: number }> {
    return Object.entries(this.data)
      .map(([key, v]: any) => ({ key, value: v.value, ts: v.ts }))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, n);
  }
}

// ── Sub-agent runner ──────────────────────────────────────────────────────────

export async function runSubAgents(
  tasks: Array<{ name: string; run: () => Promise<string> }>
): Promise<Record<string, string>> {
  const results = await Promise.all(tasks.map(async (t) => ({ name: t.name, result: await t.run() })));
  return Object.fromEntries(results.map((r) => [r.name, r.result]));
}
