# Claude Code Handoff Prompt — ClawOps Dashboard

Use this prompt with Claude Code to continue building the dashboard.

---

## Context

You are working on the ClawOps Dashboard — a Next.js 14 app that serves as the operations dashboard for Pattern Engine LLC. The project is at `/path/to/ClawOps_Dashboard` (or wherever you cloned `ConnorBritain/ClawOps_Dashboard`).

### What exists:

**Working components:**
1. **Season Tracker** (`src/components/SeasonTracker.tsx`) — Shows current PE season (Signal/Systems/Machines/Stewardship), week (1-13), current Pattern Card, current G2L Challenge Lab, progress bar, countdown. Season logic is in `src/lib/seasons.ts`.
2. **OpenRouter Spend** (`src/components/OpenRouterSpend.tsx`) — Per-agent spend via `GET /api/v1/auth/key` for 9 OpenRouter keys. Shows daily/weekly/monthly with usage bars.
3. **Content Status** (`src/components/ContentStatus.tsx`) — Searches Beacon (Supabase) for content-related thoughts to infer pipeline status.
4. **Agent Health** (`src/components/AgentHealth.tsx`) — Shows cron jobs per agent with expand/collapse detail.
5. **Business Metrics** (`src/components/BusinessMetrics.tsx`) — Aggregate cards: OpenRouter spend, Beacon thought count, Postiz posts, cron job count.
6. **Auth** (`src/middleware.ts`) — Token-based auth via cookie, query param, or Bearer header.
7. **Auto-refresh** (`src/components/RefreshProvider.tsx`) — 5-minute auto-refresh + manual refresh button.

**API routes:**
- `/api/season` — Pure computation, no external calls
- `/api/spend` — Fetches all 9 OpenRouter keys (5min cache)
- `/api/beacon` — Supabase REST for thought counts
- `/api/content-status` — Supabase search for content pipeline signals
- `/api/cron` — Tries OpenClaw gateway, falls back to static snapshot
- `/api/postiz` — Postiz API for scheduled posts

**Design system:**
- Background: #0A0A0A
- Cards: #141414 with #222 border
- Primary accent: #FF7D45 (ember orange)
- Secondary accent: #DC97FF (violet glow)
- Text: #E5E5E5 primary, #888 secondary
- Success: #4ADE80, Warning: #FBBF24, Error: #F87171
- Font: Inter

---

## What needs to be improved/added:

### High Priority

1. **Verify season start date.** The code assumes Season 1 (Signal) starts Jan 5, 2026. Confirm with `src/lib/seasons.ts` constant `YEAR_ONE_START`. If wrong, update.

2. **Content Status is too naive.** Currently it keyword-searches Beacon thoughts. It should also:
   - Query the work queue (there's a `work_items` table in Supabase with `assigned_to`, `status`, `title` columns)
   - Allow manual status override via a small admin endpoint `POST /api/content-status` that writes to a JSON file or Supabase
   - Show clearer "this week's" scope

3. **OpenRouter spend chart.** Add a small sparkline or bar chart showing daily spend over the last 7 days. OpenRouter doesn't provide historical data per-request from `/auth/key`, so you may need to:
   - Store daily snapshots in a local JSON file or Supabase table
   - Have a cron endpoint `POST /api/spend/snapshot` that the VPS calls daily to record current values

4. **Cron route live data.** When running on the VPS (not Vercel), the cron route should successfully hit `http://localhost:3030/api/cron/jobs`. Add `OPENCLAW_GATEWAY_URL=http://localhost:3030` and `OPENCLAW_GATEWAY_TOKEN` to `.env.local`. The gateway token is the OpenClaw gateway auth token.

5. **Mobile responsive.** The grid layout works on desktop. Test and fix on mobile — the Season Tracker and Business Metrics need to stack properly on small screens.

### Medium Priority

6. **Postiz channel breakdown.** Show which channels have posts scheduled (X, LinkedIn, Instagram, etc.) not just totals.

7. **Beacon recent activity feed.** Add a collapsible "Recent Activity" section at the bottom that shows the last 10-20 Beacon thoughts with timestamps, agent names, and truncated text. Good for a quick pulse check.

8. **Work queue widget.** Add a new component showing active work queue items grouped by agent. The Supabase `work_items` table has: `id`, `title`, `assigned_to`, `status`, `priority`, `venture`, `description`, `created_at`, `updated_at`.

9. **Agent status from Slack.** If we can access Slack API (token in env), show last message time per agent channel. This would give a "last seen" timestamp.

### Low Priority

10. **Spend alerts.** If any agent exceeds 80% of their weekly limit, show a warning banner at the top of the dashboard.

11. **Dark/light theme toggle.** Currently hardcoded dark. The design language only specifies dark, so this is low priority.

12. **Export/share.** A "Copy status summary" button that generates a text summary suitable for pasting into Slack.

### Deployment

13. **Vercel deployment:**
    - Connect `ConnorBritain/ClawOps_Dashboard` to Vercel
    - Set all env vars from `.env.example`
    - Add custom domain `ops.patternengine.ai`
    - Set `DASHBOARD_TOKEN` to a real token

14. **VPS deployment alternative:**
    - Run `npm run build && npm start` on port 3100
    - Accessible via Tailscale only
    - Add `OPENCLAW_GATEWAY_URL=http://localhost:3030` for live cron data

---

## Env vars needed (all in `.env.local` or Vercel dashboard):

```
# 9 OpenRouter keys (per-agent)
OPENROUTER_KEY_DAHLIA=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PE=sk-or-v1-...
OPENROUTER_KEY_CYRUS_G2L=sk-or-v1-...
OPENROUTER_KEY_CYRUS_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ECHO_PE=sk-or-v1-...
OPENROUTER_KEY_ECHO_G2L=sk-or-v1-...
OPENROUTER_KEY_ECHO_PIDGEON=sk-or-v1-...
OPENROUTER_KEY_ENZO=sk-or-v1-...
OPENROUTER_API_KEY=sk-or-v1-...

# Beacon (Supabase)
BEACON_SUPABASE_URL=https://xxx.supabase.co
BEACON_SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Postiz
POSTIZ_API_KEY=...
POSTIZ_API_URL=https://api.postiz.com/public/v1

# OpenClaw Gateway (VPS only)
OPENCLAW_GATEWAY_URL=http://localhost:3030
OPENCLAW_GATEWAY_TOKEN=...

# Dashboard Auth
DASHBOARD_TOKEN=your-secret-token
```

---

## Season system reference

Pattern Engine runs 4 seasons × 13 weeks:
- Q1 Signal: Attention, Habit, Narrative, Trust, Authority, Memory, Anxiety, Identity, Speed, Comparison, Avoidance, Presence, Wisdom
- Q2 Systems: TBD
- Q3 Machines: TBD
- Q4 Stewardship: TBD

G2L Challenge Labs run biweekly (7 per season). Odd weeks = challenge week, even = open week.

Full season data is in `src/lib/seasons.ts`. Reference docs are at:
- `~/clawops/docs/PATTERNENGINE.md`
- `~/clawops/docs/G2L/LABS/CHALLENGE_LAB_SYSTEM.md`
