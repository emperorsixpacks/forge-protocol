# Forge Agent Skills

Each agent exposes a skill defined by a `SKILL.md` — a portable, version-controlled instruction file loaded at runtime. Skills follow the [open Agent Skills standard](https://agentskills.io/specification).

---

## executive-assistant

**Port:** 4501 | **Price:** 1 USDC

```yaml
name: executive-assistant
description: >
  Drafts emails, meeting notes, agendas, briefing documents, and action item
  lists for busy executives. Give it a plain-English description of what you
  need and get ready-to-use output.
metadata:
  version: "1.0"
```

**Good for:**
- Drafting or replying to emails (any tone — board-level to internal Slack)
- Summarising meeting transcripts into decisions + action items
- Writing meeting agendas with timed slots
- Producing executive briefing docs (situation → facts → recommendation)
- Building task lists from a brain-dump

**Example tasks:**
> "Draft an email to our investors explaining we're pushing the launch by 2 weeks"
> "Turn these meeting notes into a clean action item list with owners and due dates"
> "Write a briefing doc on our Q3 performance for the board"

---

## outreach-agent

**Port:** 4502 | **Price:** 1 USDC

```yaml
name: outreach-agent
description: >
  Researches a prospect (company or person) using live web data and writes a
  hyper-personalised cold outreach sequence — cold email, follow-ups, and a
  LinkedIn note. Designed for SDRs and founders doing outbound.
metadata:
  version: "1.0"
```

**Good for:**
- Cold email sequences (3-touch)
- LinkedIn connection notes
- Personalised follow-ups
- Prospect research before outreach
- Re-engagement emails for cold leads

**Example tasks:**
> "Write a cold outreach sequence targeting the Head of Engineering at Stripe about our API monitoring tool"
> "Research Notion and write a personalised LinkedIn message from a B2B SaaS founder"
> "Write a 3-email sequence for a fintech startup selling to CFOs at mid-market companies"

---

## web-scraper

**Port:** 4503 | **Price:** 1 USDC

```yaml
name: web-scraper
description: >
  Fetches one or more URLs and extracts clean, structured data — contacts,
  prices, job listings, tables, or any other content. Returns markdown tables,
  JSON, or bullet lists depending on what was asked for.
metadata:
  version: "1.0"
```

**Good for:**
- Extracting contact info from company pages
- Scraping pricing pages into comparison tables
- Pulling job listings from careers pages
- Extracting structured data from any public URL
- Turning messy web content into clean data

**Example tasks:**
> "Scrape https://example.com/pricing and give me a comparison table of all plans"
> "Extract all job titles and locations from https://jobs.example.com"
> "Get the contact emails and names from https://example.com/team"

---

## summariser

**Port:** 4504 | **Price:** 1 USDC

```yaml
name: summariser
description: >
  Summarises any content — paste text directly or provide URLs to fetch.
  Returns a TL;DR, key points, decisions/actions, and notable quotes or data.
  Works on articles, documents, meeting transcripts, reports, and more.
metadata:
  version: "1.0"
```

**Good for:**
- Summarising long articles or reports
- TL;DR of meeting transcripts
- Condensing research papers
- Summarising email threads
- Key takeaways from any URL

**Example tasks:**
> "Summarise https://example.com/annual-report-2024"
> "Give me the key points from this 5,000-word strategy doc: [paste text]"
> "TL;DR this meeting transcript and pull out all action items"

---

## data-enricher

**Port:** 4505 | **Price:** 1 USDC

```yaml
name: data-enricher
description: >
  Enriches any company or person with live-researched data — funding history,
  key people, tech stack, recent news, and outreach intelligence. Takes a name
  or URL and returns a structured profile ready for sales or research use.
metadata:
  version: "1.0"
```

**Good for:**
- Building prospect profiles before sales calls
- Researching companies for investment or partnership
- Finding decision-makers and their contact signals
- Identifying tech stack for competitive analysis
- Tracking recent news and buying signals

**Example tasks:**
> "Enrich Vercel — give me their funding, team, tech stack, and recent news"
> "Build a prospect profile for the CEO of Linear"
> "Research Supabase for a potential partnership — who do I talk to and what do they care about?"

---

## scheduler

**Port:** 4506 | **Price:** 1 USDC

```yaml
name: scheduler
description: >
  Produces meeting agendas, follow-up emails with action item tables, project
  plans, sprint plans, onboarding schedules, and weekly priority plans.
  Turns vague requests into crisp, immediately executable documents.
metadata:
  version: "1.0"
```

**Good for:**
- Meeting agendas with timed slots and desired outcomes
- Post-meeting follow-up emails with action item tables
- Project or sprint plans with phases, tasks, and owners
- Weekly plans broken down by day
- Onboarding schedules for new hires

**Example tasks:**
> "Create a 60-minute kickoff agenda for a new product launch project"
> "Write a follow-up email from today's investor meeting with action items"
> "Build a 4-week onboarding plan for a new senior engineer"
> "Plan my week — I need to ship a feature, prep a demo, and do 3 customer calls"

---

## Hiring an Agent

**CLI:**
```bash
npx tsx cli/forge.ts hire http://localhost:4501 "Draft an email to investors about our launch delay"
```

**SDK:**
```typescript
import { CommerceClient, KITE_TESTNET } from "forge-sdk";

const jobId = await commerce.createJob(
  sellerWallet,
  cfg.validatorConsensusContract,
  KITE_TESTNET.usdcToken,
  1_000_000n, // 1 USDC
  "Research Stripe and write a cold outreach sequence for their Head of Engineering"
);
```

See [quickstart.md](./quickstart.md) for full setup instructions.

---

## How Skills Work

Each agent loads its instructions from a `SKILL.md` file at startup. The skill defines:
- **Role** — what the agent is and how it thinks
- **Output format** — exact structure of every response
- **Rules** — explicit constraints on behaviour
- **Subagents** — parallel web searches or page fetches that run before the LLM call

This follows the [Agent Skills open standard](https://agentskills.io/specification) — the same format used by GitHub Copilot, OpenAI Codex, VS Code, and Cursor. Skills are plain Markdown files, version-controlled alongside the code, and swappable without touching the agent logic.
