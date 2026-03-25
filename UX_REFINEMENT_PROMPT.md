# ClawOps Dashboard — UX/UI Refinement Pass

> Read `CLAUDE_CODE_PROMPT.md` first for full system context. This prompt is the refinement layer — data is flowing, structure exists. Now make it excellent.

---

## Current State

The dashboard is **live at ops.patternengine.ai** with real data:
- OpenRouter spend: real per-agent usage data flowing ($72+ total across 9 keys)
- Beacon: 72+ thoughts, recent activity feed working
- Season tracker: pre-launch countdown (8 days to April 1)
- Work queue: items showing from Supabase
- Quick links: Slack, Drive, OpenRouter, Postiz, Skool, Beacon in header
- PWA: manifest.json for install-as-app with ClawOps logo
- Mobile tab navigation: bottom bar with Season/Agents/Content/Metrics tabs
- Auth: currently disabled (DASHBOARD_TOKEN removed for testing)

**The codebase is 22 files, ~4000 lines total.** The main component is `DashboardShell.tsx` (1302 lines) — it's a monolith that handles all tab rendering, data fetching, and layout. The older individual components (SeasonTracker.tsx, AgentHealth.tsx, etc.) are mostly superseded by DashboardShell but still exist.

---

## Known Issues to Fix

### 1. Cron Display Problems (Agents Tab)
- **Raw cron IDs showing** under agent names — these are UUIDs like `a5ec49e9-...` leaking into the UI. They should be hidden or replaced with human-readable cron names.
- **"Last run: never" with green dots** — the static cron fallback (used on Vercel since it can't reach the OpenClaw gateway on the VPS) doesn't have real last-run data. Green dots should be **gray/neutral** when no run data exists. Green = ran successfully. Gray = no data. Red = error. Yellow = overdue.
- **Cron schedule expressions showing raw** — `30 6 * * 1-5` should render as "6:30 AM Mon-Fri" in human-readable format.

### 2. Content Pipeline Needs Rework
The Content tab currently does naive keyword search on Beacon thoughts to guess content status. This should be improved:
- Pull from `work_queue` table where `venture = 'pattern-engine'` or `venture = 'g2l'` for real pipeline status
- Show clear states: Not Started → Drafted → In Review → Published
- For pre-launch (before April 1): show "Season 1 prep" items instead of pretending there's an active content week
- Content items should be: Pattern Card (weekly), Currents Newsletter (weekly Tue), Challenge Lab (biweekly), Social Posts

### 3. Postiz Feed
Was returning 400 (fixed — now sends required date params). Verify it's showing data. If working, show:
- Number of scheduled posts this week
- Number published this week
- Next scheduled post time + channel

### 4. Agent Cards (Agents Tab) — Polish
Currently showing spend bars + cron jobs per agent. Improvements:
- **Venture badge** next to each agent name (PE orange, G2L violet, Pidgeon blue, Shared gray)
- **Spend bar should show limit context** — "$5.48 / $25.00 (22%)" not just "$5.48"
- **Warning state at 80%** — bar turns amber/yellow when approaching limit
- **Tap to expand** — collapsed view shows: emoji, name, spend bar, one-line status. Expanded shows: full cron list, work queue items, spend breakdown (daily/weekly/monthly)

### 5. Season Tracker (Season Tab) — Polish
Pre-launch countdown is working well. Minor improvements:
- Add the **Pattern Engine thesis** as a subtle tagline: "Pattern machines are here. Wisdom is optional."
- The four season preview icons at the bottom should show a subtle connecting line between them (a timeline/roadmap feel)
- On mobile, make the countdown number even bigger — this is the hero element

### 6. Metrics Tab
- **Work Queue widget** — show items grouped by agent with status badges. Each item should show: title, assigned agent, status (color-coded), venture, age.
- **Postiz stats** — scheduled this week, published this week, next scheduled
- **Monthly spend trend** — if possible, show a simple sparkline of daily spend over the last 7-14 days using just CSS/SVG (no chart library). The data is available from OpenRouter's daily usage.

---

## Design Principles

### The Aesthetic
Match [connorengland.com](https://connorengland.com): dark backgrounds, warm orange/amber accents, clean Inter typography. Think **Linear meets Bloomberg terminal** — information-dense but beautiful. Every pixel earns its place.

### Mobile First
Connor checks this on his phone at 6:31am. The bottom tab bar is the primary navigation. Each tab should feel like a standalone app screen — full-width, touch-friendly, no horizontal scrolling.

### Information Hierarchy
On each tab, the most important number should be the largest element. Use size, color, and weight to guide the eye:
1. **Primary metric** — large, colored, impossible to miss (e.g., spend amount, countdown number)
2. **Status indicators** — small colored dots or badges (green/amber/red)
3. **Detail text** — small, muted, available but not demanding attention
4. **Timestamps** — smallest, most muted, but always present

### Color Language
| Color | Meaning | Hex |
|-------|---------|-----|
| PE Orange | Primary accent, Pattern Engine | `#FF7D45` |
| G2L Violet | Secondary accent, G2L | `#DC97FF` |
| Green | Healthy, published, done, under budget | `#4ADE80` |
| Amber | Warning, drafted, approaching limit (>60%) | `#FBBF24` |
| Red | Error, critical, over budget (>90%) | `#F87171` |
| Blue | Information, Pidgeon, neutral action | `#60A5FA` |
| Gray | Unknown, no data, inactive | `#555` |

### Transitions & Micro-interactions
- Tab switches: quick fade (150ms) not slide
- Expandable cards: smooth height transition (200ms ease-out)
- Spend bars: animate width on load (500ms ease-out)
- Loading states: subtle pulse animation on card skeletons
- Refresh: brief opacity dip (100ms) on refresh to acknowledge the action
- Status dots: gentle pulse animation on "live" indicators

---

## Architecture Notes

### DashboardShell.tsx (1302 lines)
This is the main component. It:
- Fetches all data from `/api/*` routes on mount and refresh
- Manages tab state
- Renders all tab content inline
- Contains helper components (HeaderMetric, TabHeading, individual tab renderers)

**If refactoring:** Consider breaking tab renderers into separate components (`SeasonTab.tsx`, `AgentsTab.tsx`, `ContentTab.tsx`, `MetricsTab.tsx`) that receive data as props. But don't refactor for refactoring's sake — only if it makes the code more maintainable for the specific changes you're making.

### Data Refresh
- `RefreshProvider` provides auto-refresh every 5 minutes + manual refresh button
- All API routes have `revalidate` set (60s for season/cron, 300s for spend/beacon/work, 900s for postiz)
- Data fetching happens in DashboardShell's useEffect, keyed on `refreshKey`

### Cron Data (Static Fallback)
The OpenClaw gateway runs on a VPS (localhost:18789) that Vercel can't reach. The cron API route falls back to a hardcoded schedule. This is why "last run" shows "never." The static data should be improved to show realistic cron info:

**Hardcode the actual 15 cron jobs with their schedules:**
| Name | Agent | Schedule (CT) |
|------|-------|--------------|
| Morning Orchestrator | dahlia | 6:30am M-F |
| Weekly Content Check | dahlia | 9:00am Mon |
| EOD Synthesis | dahlia | 9:00pm M-F |
| Weekly Review | dahlia | 7:00pm Sun |
| Repo Sync | dahlia | 5:00am Daily |
| Monday Check-in | enzo | 7:00am Mon |
| Thursday Pulse | enzo | 12:00pm Thu |
| Work Queue Check | cyrus-pe | 8:00am M-F |
| Work Queue Check | cyrus-g2l | 8:00am M-F |
| Work Queue Check | cyrus-pidgeon | 8:00am M-F |
| Weekly Content Plan | echo-pe | 10:00am Mon |
| Mid-week Check | echo-pe | 10:00am Wed |
| Currents Newsletter | echo-g2l | 9:00am Tue |
| Challenge Lab Plan | echo-g2l | 10:30am Mon |
| Friday Recap | echo-g2l | 3:00pm Fri |

For each cron, compute "next fire" from the schedule + current time. Show "last run" as gray/unknown since we don't have that data on Vercel.

---

## Priority Order

1. **Fix cron display** — human-readable schedules, correct status colors, hide raw IDs
2. **Agent cards polish** — venture badges, spend with limit context, warning states
3. **Content pipeline rework** — work queue integration, clear status states
4. **Metrics tab** — work queue widget, Postiz stats
5. **Season tab polish** — thesis tagline, timeline connector
6. **Micro-interactions** — transitions, loading states, animations
7. **Code cleanup** — if time allows, break DashboardShell into tab components

**Test at 375px (iPhone SE), 390px (iPhone 14), and 1440px (desktop).** Every change must work on all three.

---

## What NOT to Do

- Don't add heavy dependencies (chart libraries, animation frameworks)
- Don't break the tab navigation or data fetching
- Don't remove the quick links or PWA manifest
- Don't change the API routes (they're working)
- Don't touch the season computation logic (it's correct — April 1 start date)
- Don't add auth back yet (we'll re-add it properly later)
