# Agent Prompt Zero — ClawOps Dashboard

> This document is the complete context handoff for any coding agent (Claude Code, Codex, Cursor, etc.) working on the ClawOps Dashboard. Read this entirely before making changes.

---

## What Is This?

The **ClawOps Dashboard** is the single-pane-of-glass operations dashboard for **Pattern Engine LLC** — a one-person holding company powered by autonomous AI agent teams. It is the command center where the human operator (Connor England) checks on his entire AI-powered venture ecosystem from his phone, tablet, or desktop.

Pattern Engine LLC runs three ventures:
- **Pattern Engine (PE)** — AI consultancy, thought leadership, Substack newsletter
- **Generative Growth Labs (G2L)** — AI education community, Skool, workshops, challenge labs
- **Pidgeon Health** — Tauri desktop app for healthcare interface assurance

Each venture is staffed by AI agents that run 24/7 on a VPS via [OpenClaw](https://github.com/openclaw/openclaw) — an open-source AI agent orchestration platform. The agents have names, roles, budgets, cron schedules, and produce measurable output. This dashboard monitors all of it.

### The Agent Team

| Agent | Role | Venture | Emoji |
|-------|------|---------|-------|
| **Dahlia** | Chief of Staff / Orchestrator | Shared | 🌸 |
| **Cyrus PE** | Builder & CEO Agent | Pattern Engine | 🦅 |
| **Cyrus G2L** | Builder & CEO Agent | G2L | 🦅 |
| **Cyrus Pidgeon** | Builder & CEO Agent | Pidgeon Health | 🦅 |
| **Echo PE** | Content & Communications | Pattern Engine | 🔊 |
| **Echo G2L** | Content & Communications | G2L | 🔊 |
| **Echo Pidgeon** | Content & Communications | Pidgeon Health | 🔊 |
| **Enzo** | Wellness & Human Check-ins | Shared | 🧘 |

Each agent has its own OpenRouter API key with spend limits, its own cron job schedule, and its own work queue items.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3.4
- **Language:** TypeScript
- **Deployment:** Vercel (production) / VPS with Tailscale (dev)
- **Data Sources:** OpenRouter API, Supabase (Beacon knowledge graph), Postiz (social scheduling), OpenClaw Gateway (cron jobs)
- **Auth:** Token-based middleware (cookie + Bearer + query param)

---

## Current Architecture

### File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (Inter font, dark theme)
│   ├── page.tsx            # Main page — grid of all widgets
│   ├── globals.css         # Tailwind + CSS variables + card class
│   ├── api/
│   │   ├── season/route.ts       # Computed season state (no external calls)
│   │   ├── spend/route.ts        # Fetches 9 OpenRouter keys for spend data
│   │   ├── beacon/route.ts       # Supabase: thought counts + recent activity
│   │   ├── content-status/route.ts  # Supabase: content pipeline signals
│   │   ├── cron/route.ts         # OpenClaw gateway or static fallback
│   │   ├── postiz/route.ts       # Postiz API for social post counts
│   │   └── work/route.ts         # Supabase: work queue items
│   └── fonts/                    # Geist font files (woff)
├── components/
│   ├── SeasonTracker.tsx    # Season progress, pattern card, challenge lab
│   ├── OpenRouterSpend.tsx  # Per-agent spend with usage bars
│   ├── ContentStatus.tsx    # Content pipeline (pattern card, newsletter, etc.)
│   ├── AgentHealth.tsx      # Cron jobs grouped by agent, expandable
│   ├── BusinessMetrics.tsx  # Aggregate KPI cards (spend, beacon, postiz, cron)
│   ├── RecentActivity.tsx   # Beacon thought feed
│   └── RefreshProvider.tsx  # Context provider for 5-min auto-refresh + manual
├── lib/
│   ├── seasons.ts           # Season calendar, pattern cards, challenge labs, state computation
│   └── agents.ts            # Agent registry (id, name, venture, envKey, emoji)
├── middleware.ts             # Token-based auth gate
public/
└── clawops-logo.png         # Dashboard logo (robot mascot)
```

### Data Flow

All API keys are **server-side only** (Next.js API routes). The client components fetch from internal `/api/*` routes, never from external APIs directly.

```
Browser → /api/spend → OpenRouter (9 keys) → aggregated JSON
Browser → /api/beacon → Supabase REST → thought counts + recent
Browser → /api/cron → OpenClaw Gateway (or static fallback)
Browser → /api/season → Pure date computation (no external calls)
Browser → /api/postiz → Postiz REST API
Browser → /api/work → Supabase REST (work_items table)
Browser → /api/content-status → Supabase REST (keyword search)
```

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0A` | Page background |
| `--bg-card` | `#141414` | Card backgrounds |
| `--border-subtle` | `#222` | Card borders |
| `--pe-orange` | `#FF7D45` | Primary accent (Pattern Engine) |
| `--g2l-violet` | `#DC97FF` | Secondary accent (G2L) |
| Text primary | `#E5E5E5` | Body text |
| Text secondary | `#888` / neutral-500 | Labels, metadata |
| Success | `#4ADE80` | Healthy / published |
| Warning | `#FBBF24` | Caution / drafted |
| Error | `#F87171` | Critical / errors |
| Font | Inter | Via Google Fonts CDN |

Cards use the `.card` utility class: `bg-[#141414] border border-[#222] rounded-xl p-5`

---

## The Seasonal System

Pattern Engine operates on a **4 seasons × 13 weeks = 52-week annual cycle**. This is the backbone of both PE content and G2L education.

**Season 1 starts April 1, 2026** for both PE and G2L.

| Season | Name | Theme | Accent |
|--------|------|-------|--------|
| S1 | Signal | Patterns of attention, meaning, perception | `#FF7D45` |
| S2 | Systems | Patterns of workflow, teams, incentives | `#4ADE80` |
| S3 | Machines | Patterns of AI: context, retrieval, agency | `#60A5FA` |
| S4 | Stewardship | Patterns of ethics, power, embodiment | `#DC97FF` |

Each season has 13 **Pattern Cards** (weekly themes) and 7 **G2L Challenge Labs** (biweekly hands-on builds).

Season 1 (Signal) Pattern Cards:
1. Attention, 2. Habit, 3. Narrative, 4. Trust, 5. Authority, 6. Memory, 7. Anxiety, 8. Identity, 9. Speed, 10. Comparison, 11. Avoidance, 12. Presence, 13. Wisdom

Season 1 (Signal) Challenge Labs:
1. Focus Architecture (W1-2), 2. Voice & Trust (W3-4), 3. Memory Architecture (W5-6), 4. Digital Twin Identity (W7-8), 5. Information Diet (W9-10), 6. Pattern Recognition (W11-12), 7. Capstone: Your Signal Stack (W13)

The season logic lives in `src/lib/seasons.ts`. The `getSeasonState()` function computes the current state from the system clock. Before April 1, 2026, it returns a **pre-launch countdown** state.

---

## What Needs to Change: Mobile-First Redesign

### The Problem

The current layout is a desktop grid. It does not work well on mobile:
- Cards get squished on narrow viewports
- All widgets render on one scrollable page — too much information density for a phone screen
- No way to quick-glance at one section without scrolling past others
- The Business Metrics cards try to fit 4-across in a narrow sidebar column

### The Solution: Tab-Based Mobile Navigation

Redesign the dashboard with a **mobile-first, tab-based layout** — like Airbnb, Instagram, or any modern mobile app. The pattern:

#### Bottom Tab Bar (Mobile)

A fixed bottom navigation bar with 4-5 icon tabs. Tapping a tab switches the main content area to that section's view. Only one section is visible at a time on mobile.

**Proposed Tabs:**

| Icon | Label | Content |
|------|-------|---------|
| 📡 | Season | Season Tracker (full-width, expanded) — current season, week, pattern card, challenge lab, progress |
| 🤖 | Agents | Agent Fleet + OpenRouter Spend combined — per-agent health, spend, cron status |
| 📝 | Content | Content Pipeline + Recent Activity — what's drafted, published, upcoming |
| 📊 | Metrics | Business Metrics + Work Queue — KPIs, aggregate numbers, active tasks |

#### Desktop Behavior

On desktop (≥1024px), the tab bar disappears and the layout reverts to a responsive grid — either the current 2-3 column layout or a refined version of it. The tabs become sections on a single scrollable page, or optionally keep the tab navigation as a sidebar.

#### Implementation Approach

1. **Create a `TabLayout` component** that wraps the page content:
   - On mobile: renders a fixed bottom tab bar + single active panel
   - On desktop: renders all panels in a grid (no tab bar)
   - Use a media query or Tailwind responsive classes to switch behavior
   - The active tab state is managed via React state (or URL hash for shareability)

2. **Bottom Tab Bar Design:**
   - Fixed to bottom of viewport (`fixed bottom-0 left-0 right-0`)
   - Background: `#141414` with top border `#222`
   - Height: ~64px (safe area padding for iOS notch: `pb-safe`)
   - Each tab: icon (24px) + label (10px text) stacked vertically
   - Active tab: accent color (`#FF7D45`), inactive: `#666`
   - Subtle scale/opacity transition on tap

3. **Page structure change:**
   ```
   Mobile:
   ┌──────────────────────────┐
   │ Header (logo + status)   │
   ├──────────────────────────┤
   │                          │
   │   Active Tab Content     │
   │   (scrollable)           │
   │                          │
   │                          │
   │                          │
   ├──────────────────────────┤
   │ 📡  🤖  📝  📊          │  ← Bottom tab bar
   └──────────────────────────┘

   Desktop (≥1024px):
   ┌──────────────────────────────────────────────┐
   │ Header (logo + status + refresh)             │
   ├────────────────────────┬─────────────────────┤
   │ Season Tracker         │ Business Metrics    │
   ├────────────────────────┼─────────────────────┤
   │ Content Pipeline       │ Agent Fleet         │
   ├────────────────────────┴─────────────────────┤
   │ OpenRouter Spend (full width)                │
   ├──────────────────────────────────────────────┤
   │ Recent Activity (full width)                 │
   └──────────────────────────────────────────────┘
   ```

4. **Each tab's mobile view should be designed for touch:**
   - Large tap targets (minimum 44px)
   - Generous spacing between interactive elements
   - Horizontal swipe between tabs (optional, nice-to-have)
   - Pull-to-refresh gesture (optional)
   - Cards should be full-width with comfortable padding

5. **Header simplification on mobile:**
   - Compact header: logo (32px) + "ClawOps" text + connected indicator
   - Refresh button in header (top-right)
   - Auto/Manual toggle can move into a settings sheet

#### CSS/Tailwind Strategy

- Use Tailwind's responsive prefixes: `lg:hidden` for tab bar, `hidden lg:grid` for desktop grid
- For the tab content switching, use conditional rendering or CSS `hidden` class — NOT route-based navigation (keep it SPA-fast)
- Add `safe-area-inset-bottom` padding for iOS: `env(safe-area-inset-bottom)`
- Test at 375px (iPhone SE), 390px (iPhone 14), 428px (iPhone 14 Pro Max)

---

## Additional Improvements to Make

### Season Tracker Enhancements
- Before April 1, 2026: show a **launch countdown** with days remaining, not fake progress
- After launch: show current week's Pattern Card prominently with description
- The challenge lab section should clearly show "Challenge Week" vs "Open Week" status

### Content Pipeline
- Currently uses naive keyword search on Beacon thoughts — improve with work queue integration
- Show clearer "this week" scope
- Add manual status override capability

### OpenRouter Spend
- Add sparkline or mini bar chart for 7-day trend (requires daily snapshot storage)
- Show warning banner if any agent exceeds 80% of weekly limit

### Agent Fleet + Cron
- Combine agent health + spend into a unified per-agent view on mobile
- Show "last seen" timestamp per agent if possible
- On mobile, each agent should be an expandable card showing: spend, cron jobs, work items

### Work Queue
- The `/api/work` route exists but there's no component rendering it yet
- Build a work queue widget showing active items grouped by agent
- Supabase `work_items` table schema: `id`, `title`, `assigned_to`, `status`, `priority`, `venture`, `description`, `created_at`, `updated_at`

---

## Environment Variables

All server-side. Set in `.env.local` for dev, Vercel dashboard for production.

```bash
# OpenRouter keys (9 total — one per agent)
OPENROUTER_KEY_DAHLIA=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PE=sk-or-v1-...
OPENROUTER_KEY_CYRUS_G2L=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ECHO_PE=sk-or-v1-...
OPENROUTER_KEY_ECHO_G2L=sk-or-v1-...
OPENROUTER_KEY_ECHO_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ENZO=sk-or-v1-...
OPENROUTER_API_KEY=sk-or-v1-...       # shared/default key

# Beacon (Supabase-hosted knowledge graph)
BEACON_SUPABASE_URL=https://xxx.supabase.co
BEACON_SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Postiz (social media scheduling)
POSTIZ_API_KEY=...
POSTIZ_API_URL=https://api.postiz.com/public/v1

# OpenClaw Gateway (VPS-only — live cron data)
OPENCLAW_GATEWAY_URL=http://localhost:3030
OPENCLAW_GATEWAY_TOKEN=...

# Dashboard auth
DASHBOARD_TOKEN=your-secret-token
```

---

## Deployment

- **Production:** Vercel, connected to `ConnorBritain/ClawOps_Dashboard` repo
- **Custom domain:** `ops.patternengine.ai` (via Cloudflare DNS → Vercel)
- **Dev / VPS:** `npm run build && npm start` on port 3100, Tailscale-only access
- **Framework preset in Vercel:** Must be set to **Next.js** (not "Other")
- **`vercel.json`** exists in repo root with `"framework": "nextjs"` as a safety net

---

## Constraints & Anti-Patterns

- **NEVER expose API keys to the client.** All external API calls happen in `/api/*` server routes.
- **NEVER remove existing functionality.** Refactor and improve, don't delete working features.
- **NEVER break the auth middleware.** Token-based access is the security layer.
- **Keep bundle size small.** No heavy charting libraries unless absolutely necessary — prefer CSS/SVG for sparklines and progress bars.
- **Respect API rate limits.** OpenRouter, Supabase, and Postiz all have caching set at the route level (revalidate). Don't bypass.
- **Test on mobile viewports.** This is a mobile-first redesign. If it doesn't work on a 375px screen, it's not done.

---

## Summary of Work

**Priority 1 — Mobile Tab Navigation:**
1. Create `TabLayout` component with bottom tab bar
2. Reorganize page.tsx to use tab-based rendering on mobile
3. Show full grid on desktop (≥1024px), tabs on mobile
4. Style the tab bar to match the dark design system
5. Add safe-area padding for iOS

**Priority 2 — Per-Tab Content Refinement:**
1. Season tab: full-width tracker with expanded pattern card details
2. Agents tab: combined agent health + spend + cron in card-per-agent layout
3. Content tab: pipeline + recent activity feed
4. Metrics tab: KPI cards + work queue widget (new component needed)

**Priority 3 — Data & Polish:**
1. Build the work queue component (data route already exists at `/api/work`)
2. Improve content status beyond keyword search
3. Add spend trend visualization
4. Pull-to-refresh and swipe gestures (nice-to-have)

The goal: Connor should be able to pull out his phone, tap a tab, and instantly know the state of his agent empire.
