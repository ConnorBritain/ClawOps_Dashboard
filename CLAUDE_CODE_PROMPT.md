# ClawOps Dashboard — Complete System Context & Build Specification

> This document is the complete context handoff for any coding agent working on the ClawOps Dashboard. You have never heard of any of this before. Read this entirely before writing a single line of code.

---

## Part 1: Who Is Connor England?

Connor England is a solo founder and senior applied intelligence engineer. By day he builds enterprise RAG systems at a healthcare technology company. By night (and morning) he runs **Pattern Engine LLC** — a one-person holding company with three ventures, each staffed by autonomous AI agents.

He lives in Kansas (Central Time), is a husband and father, and cares deeply about using technology to amplify what's human rather than replace it. His personal site is [connorengland.com](https://connorengland.com). The site has a dark theme with warm orange/amber accents — this dashboard should match that aesthetic.

---

## Part 2: Pattern Engine LLC — The Three Ventures

### Pattern Engine (PE) — The Trust Engine
A weekly media platform exploring how humans and machines recognize patterns. Published on Substack, YouTube, and podcast. The core thesis: **"Pattern machines are here. Wisdom is optional. Let's make it non-negotiable."**

PE publishes three content types on Substack:
- **Pattern Cards** — weekly essay tied to the current seasonal theme (the spine)
- **Build Notes** — technical deep-dives on AI builds (ad hoc)
- **Marginalia** — personal reflections with a "Pattern Thread" connecting back to the thesis (ad hoc)

Every piece of content, regardless of type, must include a **Pattern Thread** — 2-3 lines tying the topic back to the central thesis. This is the gravitational pull that keeps everything coherent.

### Generative Growth Labs (G2L) — The Builder's Community
A free Skool community for builders who use AI with intention. G2L is NOT "use AI to make money fast" — it exists because of the Pattern Engine thesis: technology should amplify what's human, not replace it.

Revenue comes from one-time paid experiences only (no monthly subscription):
- Sprint Cohorts ($200-400, 2 weeks, 8-10 people)
- Claude Code Jams ($150-250, 1hr 1:1 build sessions)
- ClawOps Setups ($500-750, done-with-you agent fleet configuration)
- Self-paced courses ($49-99, recorded sprint cohorts)

G2L publishes **Currents** — a weekly curated AI intelligence newsletter on Beehiiv every Tuesday. Patterns (PE) are the deep, recurring structures. Currents are what's moving right now. Same thesis, different timeframes.

### Pidgeon Health — The Proof
A CLI-first healthcare interoperability platform (HL7/FHIR/NCPDP). Three products share one engine: Post (CLI testing), Flock (population generation), Loft (interface monitoring). 2,173+ tests, Tauri v2 desktop app, marketing site live. Not yet revenue-generating. Pidgeon is never marketed directly — it's the living case study.

---

## Part 3: The Seasonal System

Pattern Engine LLC operates on a **4 seasons × 13 weeks = 52-week annual cycle**. This is the backbone of all content, education, and community programming.

**Year 1, Season 1 starts April 1, 2026.** This is the fiscal year anchor for all tracking. Before this date, the dashboard MUST show a pre-launch countdown, NOT active season progress.

The seasons are a **spiral from self outward and back**:

| Season | Name | Theme | Accent Color |
|--------|------|-------|-------------|
| S1 | **Signal** | Patterns of attention, meaning, perception, formation | `#FF7D45` |
| S2 | **Systems** | Patterns of workflow, teams, incentives, governance | `#4ADE80` |
| S3 | **Machines** | Patterns of AI: context, retrieval, evals, agency | `#60A5FA` |
| S4 | **Stewardship** | Patterns of ethics, power, dependency, embodiment | `#DC97FF` |

### Season 1 (Signal) — 13 Weekly Pattern Cards
1. **Attention** — What you attend to grows. What AI attends to is trained. Neither is neutral.
2. **Habit** — The invisible architecture of your day. AI automates habits — but whose?
3. **Narrative** — The stories we tell about ourselves shape what we build.
4. **Trust** — Earned vs assumed. What happens when "the model said so" replaces "I thought about it"?
5. **Authority** — Who do you listen to? What happens when the authority is a machine?
6. **Memory** — What's worth remembering? Context windows and human storytelling share more than you think.
7. **Anxiety** — The signal underneath the noise. What your resistance is trying to tell you.
8. **Identity** — Who are you becoming? Technology changes who you are, not just what you do.
9. **Speed** — Faster isn't always better. When does velocity become violence?
10. **Comparison** — The quiet thief. Benchmarks, leaderboards, and the human cost of optimization.
11. **Avoidance** — What are you not looking at? The patterns we refuse to name are the ones running us.
12. **Presence** — The opposite of automation. What does it mean to be HERE?
13. **Wisdom** — The capstone. Not intelligence, not knowledge. Wisdom.

### Season 1 (Signal) — 7 Biweekly G2L Challenge Labs
1. **Focus Architecture** (W1-2) — Attention + Habit
2. **Voice & Trust** (W3-4) — Narrative + Trust
3. **Memory Architecture** (W5-6) — Authority + Memory
4. **Digital Twin Identity** (W7-8) — Anxiety + Identity
5. **Information Diet** (W9-10) — Speed + Comparison
6. **Pattern Recognition** (W11-12) — Avoidance + Presence
7. **Capstone: Your Signal Stack** (W13) — Wisdom

Challenge Labs alternate: odd weeks = "Challenge Week" 🔥, even weeks = "Open Week" 🔧 (showcase/catch-up).

---

## Part 4: The Agent Fleet (ClawOps)

8 AI agents run 24/7 on a Hetzner CCX23 VPS (4 vCPU, 16GB RAM, Ashburn VA) via [OpenClaw](https://github.com/openclaw/openclaw). Coordinated through Slack. Each has its own OpenRouter API key with weekly spending limits.

| Agent | Role | Venture | Weekly Budget | Emoji |
|-------|------|---------|--------------|-------|
| **Dahlia** | Chief of Staff / Orchestrator | Shared | $20/wk | 🌸 |
| **Cyrus PE** | Builder & CEO Agent | Pattern Engine | $25/wk | 🦅 |
| **Cyrus G2L** | Builder & CEO Agent | G2L | $25/wk | 🦅 |
| **Cyrus Pidgeon** | Builder & CEO Agent | Pidgeon Health | $25/wk | 🦅 |
| **Echo PE** | Content & Communications | Pattern Engine | $25/wk | 🔊 |
| **Echo G2L** | Content & Communications | G2L | $20/wk | 🔊 |
| **Echo Pidgeon** | Content & Communications | Pidgeon Health | $25/wk | 🔊 |
| **Enzo** | Wellness Coach | Shared | $18/wk | 🧘 |

There is also a **shared/default key** (🔑) used as a fallback.

### Cron Schedule (15 active jobs)

| Time (CT) | Day | Agent | Job |
|-----------|-----|-------|-----|
| 5:00am | Daily | Dahlia | Repo sync |
| 6:30am | M-F | Dahlia | Morning Orchestrator |
| 7:00am | Mon | Enzo | Monday Check-in |
| 8:00am | M-F | Cyrus ×3 | Work Queue Check (silent if empty) |
| 9:00am | Mon | Dahlia | Weekly Content Calendar |
| 9:00am | Tue | Echo-G2L | Currents newsletter |
| 10:00am | Mon | Echo-PE | Weekly Content Plan |
| 10:00am | Wed | Echo-PE | Mid-week Check |
| 10:30am | Mon | Echo-G2L | Challenge Lab Plan |
| 12:00pm | Thu | Enzo | Thursday Pulse |
| 3:00pm | Fri | Echo-G2L | Friday Recap |
| 9:00pm | M-F | Dahlia | EOD Synthesis |
| 7:00pm | Sun | Dahlia | Weekly Review |
| 10:00am | Biweekly Mon | Echo-Pidgeon | Newsletter Check |

---

## Part 5: Data Sources & APIs

### OpenRouter (Agent Spend)
Each agent has its own API key. Query each to get spend data.

**Endpoint:** `GET https://openrouter.ai/api/v1/auth/key`
**Auth:** `Authorization: Bearer sk-or-v1-...`
**Response:**
```json
{
  "data": {
    "usage": 5.48,
    "limit": 25,
    "is_free_tier": false,
    "usage_daily": 1.23,
    "usage_weekly": 5.48,
    "usage_monthly": 12.34,
    "limit_remaining": 19.52
  }
}
```

### Beacon (Supabase Knowledge Graph)
**Auth:** `apikey` and `Authorization` headers with the service role key.
**Tables:**
- `thoughts` — id, created_at, raw_text, domain, thought_type, topics, people, source, archived
- `work_queue` — id, title, description, assigned_to, assigned_by, status (queued/confirmed/in_progress/review/done/cancelled), priority (urgent/high/normal/low), venture, created_at, updated_at, completed_at
- `decisions` — id, title, domain, context, decision, reasoning
- `weekly_reviews` — id, week_start, week_end, summary, thoughts_captured

### Postiz (Social Scheduling)
**IMPORTANT:** Auth header is `Authorization: $KEY` — NO "Bearer" prefix. Just the raw key.
**Rate limit:** 30 requests/hour.
**Base URL:** `https://api.postiz.com/public/v1`
**Endpoints:** `/integrations` (list channels), `/posts` (list/create posts)

**Connected channels (8):**
Connor X, Connor LinkedIn, Connor Instagram, Connor TikTok, Connor YouTube, G2L X, G2L LinkedIn, Pidgeon LinkedIn, G2L Skool

### OpenClaw Gateway
Only accessible from the VPS (localhost:18789). For Vercel deployment, use static fallback data for cron status. The cron schedule is defined above — hardcode it as fallback.

---

## Part 6: Current Codebase

### Tech Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS 3.4
- Deployed on Vercel at `ops.patternengine.ai`
- Token-based auth middleware

### Design System
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0A` | Page background |
| `--bg-card` | `#141414` | Card backgrounds |
| `--border-subtle` | `#222` | Card borders |
| `--pe-orange` | `#FF7D45` | Primary accent (PE orange) |
| `--g2l-violet` | `#DC97FF` | Secondary accent (G2L violet) |
| Text primary | `#E5E5E5` | Body text |
| Text muted | `#888` | Labels, metadata |
| Success | `#4ADE80` | Healthy, published, done |
| Warning | `#FBBF24` | Caution, drafted, approaching limit |
| Error | `#F87171` | Critical, errors, over budget |

Cards: `.card` = `bg-[#141414] border border-[#222] rounded-xl p-5`

The aesthetic should match [connorengland.com](https://connorengland.com): dark backgrounds, warm orange/amber accents, clean typography (Inter), minimal but information-dense. Think Linear meets Vercel dashboard meets Bloomberg terminal — dark, data-rich, beautiful.

---

## Part 7: What to Build — Mobile-First Redesign

### The Core Problem
This is a phone-first dashboard. Connor checks it while drinking coffee. The current desktop grid is unusable on a 375px screen.

### Solution: Bottom Tab Navigation (Mobile)

Fixed bottom tab bar on mobile, full grid on desktop (≥1024px).

**4 Tabs:**

| Icon | Label | Shows |
|------|-------|-------|
| 📡 | Season | Season tracker — countdown or active season with pattern card + challenge lab |
| 🤖 | Agents | Per-agent cards: emoji + name, spend bar, cron status, work queue items. Tap to expand. |
| 📝 | Content | Content pipeline (what's drafted/reviewed/published) + recent Beacon activity feed |
| 📊 | Metrics | Business KPIs (total spend, Beacon thoughts, Postiz posts) + work queue grouped by agent |

**Tab Bar Design:**
- Fixed: `fixed bottom-0 left-0 right-0 z-50`
- Background: `#141414`, top border: `#222`
- Height: 64px + `env(safe-area-inset-bottom)` for iOS
- Icons: 24px, labels: 10px, stacked vertically
- Active tab: `#FF7D45`, inactive: `#666`
- Hidden on desktop: `lg:hidden`
- Transition: scale + opacity on tap

**Mobile content area:** Add `pb-20` (80px) to main content to prevent tab bar overlap. Each tab's content is full-width, scrollable, with comfortable touch-sized spacing.

**Desktop (≥1024px):** Tab bar hidden. All sections visible in a responsive grid. Current layout is a reasonable starting point — refine but don't reinvent.

### Component: WorkQueue (NEW — needed for Metrics tab)
Fetch from `/api/work`. Show active items grouped by assigned agent. Status badges with colors:
- queued: gray
- confirmed: blue
- in_progress: amber
- review: violet
- done: green (usually filtered out)

### Component: Agents Tab (REDESIGN)
Combine OpenRouterSpend + AgentHealth + WorkQueue into a unified per-agent view. Each agent is a card showing:
- Emoji + name + venture badge
- Spend bar (usage vs limit, color-coded)
- Last cron fired / next cron
- Active work items count
- Tap to expand: full cron list, spend breakdown, work item details

---

## Part 8: Environment Variables

All server-side. `.env.local` for dev, Vercel dashboard for production.

```bash
OPENROUTER_KEY_DAHLIA=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PE=sk-or-v1-...
OPENROUTER_KEY_CYRUS_G2L=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ECHO_PE=sk-or-v1-...
OPENROUTER_KEY_ECHO_G2L=sk-or-v1-...
OPENROUTER_KEY_ECHO_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ENZO=sk-or-v1-...
OPENROUTER_API_KEY=sk-or-v1-...

BEACON_SUPABASE_URL=https://xxx.supabase.co
BEACON_SUPABASE_SERVICE_ROLE_KEY=eyJ...

POSTIZ_API_KEY=...
POSTIZ_API_URL=https://api.postiz.com/public/v1

DASHBOARD_TOKEN=your-secret-token
```

---

## Part 9: Constraints

- **NEVER expose API keys to the client.** All external calls in `/api/*` server routes only.
- **NEVER remove working functionality.** Improve, don't delete.
- **NEVER break auth middleware.**
- **Keep bundle small.** CSS/SVG for visualizations, not heavy chart libraries.
- **Respect rate limits.** Cache at route level (revalidate).
- **Mobile first.** If it doesn't work at 375px, it's not done.
- **No AI attribution in commits.**

---

## Part 10: Build Priority

1. **TabLayout + bottom tab bar** — the structural foundation for mobile
2. **Season tab** — pre-launch countdown (currently working, just needs mobile optimization)
3. **Agents tab** — unified per-agent cards (biggest new component)
4. **Content tab** — pipeline + recent activity (mostly exists, needs mobile layout)
5. **Metrics tab** — KPI cards + WorkQueue widget (new component)
6. **Desktop grid refinement** — ensure desktop still looks great
7. **Polish** — transitions, loading states, error states, pull-to-refresh

**The goal:** Connor pulls out his phone at 6:31am, opens ops.patternengine.ai, taps 🤖, and instantly knows which agents are healthy, which are over budget, and what work is queued — all before his coffee is ready.
