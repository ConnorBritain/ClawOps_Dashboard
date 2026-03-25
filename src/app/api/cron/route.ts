import { NextResponse } from "next/server";

export const revalidate = 60; // 1 min cache

// For the VPS-hosted version, we can hit the OpenClaw gateway directly.
// For Vercel, we'd need a snapshot push mechanism.
// This route tries the gateway first, falls back to cached data.

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:3030";

interface CronJobState {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastRunStatus?: string;
  lastStatus?: string;
  lastDurationMs?: number;
  consecutiveErrors?: number;
}

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr?: string;
    tz?: string;
  };
  state?: CronJobState;
}

interface CronSummary {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  nextRunAt: string | null;
  lastDurationMs: number | null;
  consecutiveErrors: number;
}

function formatSchedule(schedule: CronJob["schedule"]): string {
  if (schedule.kind === "cron" && schedule.expr) {
    return schedule.expr;
  }
  return schedule.kind;
}

function formatTimestamp(ms: number | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

export async function GET() {
  try {
    // Try to fetch live cron data from gateway
    const res = await fetch(`${GATEWAY_URL}/api/cron/jobs`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN || ""}`,
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const jobs: CronJob[] = data.jobs || [];

      const summary: CronSummary[] = jobs.map((j) => ({
        id: j.id,
        agentId: j.agentId,
        name: j.name || j.id,
        enabled: j.enabled,
        schedule: formatSchedule(j.schedule),
        lastRunAt: formatTimestamp(j.state?.lastRunAtMs),
        lastStatus: j.state?.lastStatus || null,
        nextRunAt: formatTimestamp(j.state?.nextRunAtMs),
        lastDurationMs: j.state?.lastDurationMs || null,
        consecutiveErrors: j.state?.consecutiveErrors || 0,
      }));

      // Group by agent
      const byAgent: Record<string, CronSummary[]> = {};
      for (const job of summary) {
        if (!byAgent[job.agentId]) byAgent[job.agentId] = [];
        byAgent[job.agentId].push(job);
      }

      return NextResponse.json({
        jobs: summary,
        byAgent,
        summary: {
          total: summary.length,
          enabled: summary.filter((j) => j.enabled).length,
          errors: summary.filter((j) => j.consecutiveErrors > 0).length,
        },
        source: "live",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Gateway not reachable — fall back to static
  }

  // Fallback: return static snapshot
  const fallback = getFallbackData();
  return NextResponse.json({
    ...fallback,
    source: "static",
    fetchedAt: new Date().toISOString(),
  });
}

function getFallbackData() {
  const jobs: CronSummary[] = [
    { id: "dahlia-eod", agentId: "dahlia", name: "EOD Synthesis", enabled: true, schedule: "0 21 * * 1-5", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 44368, consecutiveErrors: 0 },
    { id: "dahlia-morning", agentId: "dahlia", name: "Morning Orchestrator", enabled: true, schedule: "30 6 * * 1-5", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 87252, consecutiveErrors: 0 },
    { id: "dahlia-content", agentId: "dahlia", name: "Weekly Content Check", enabled: true, schedule: "0 9 * * 1", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "dahlia-review", agentId: "dahlia", name: "Weekly Review", enabled: true, schedule: "0 19 * * 0", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "repo-sync", agentId: "dahlia", name: "Repo Sync", enabled: true, schedule: "0 5 * * *", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "cyrus-pe-work", agentId: "cyrus-pe", name: "Work Check", enabled: true, schedule: "0 8 * * 1-5", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 28767, consecutiveErrors: 0 },
    { id: "cyrus-g2l-work", agentId: "cyrus-g2l", name: "Work Check", enabled: true, schedule: "0 8 * * 1-5", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 23472, consecutiveErrors: 0 },
    { id: "cyrus-pidgeon-work", agentId: "cyrus-pidgeon", name: "Work Check", enabled: true, schedule: "0 8 * * 1-5", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 16537, consecutiveErrors: 0 },
    { id: "echo-pe-weekly", agentId: "echo-pe", name: "Weekly Plan", enabled: true, schedule: "0 10 * * 1", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "echo-pe-midweek", agentId: "echo-pe", name: "Mid-week Check", enabled: true, schedule: "0 10 * * 3", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "echo-g2l-challenge", agentId: "echo-g2l", name: "Challenge Plan", enabled: true, schedule: "30 10 * * 1", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "echo-g2l-currents", agentId: "echo-g2l", name: "Currents", enabled: true, schedule: "0 9 * * 2", lastRunAt: null, lastStatus: "ok", nextRunAt: null, lastDurationMs: 165466, consecutiveErrors: 0 },
    { id: "echo-g2l-friday", agentId: "echo-g2l", name: "Friday Recap", enabled: true, schedule: "0 15 * * 5", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "echo-pidgeon-newsletter", agentId: "echo-pidgeon", name: "Newsletter", enabled: true, schedule: "0 10 1-7,15-21 * 1", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "enzo-monday", agentId: "enzo", name: "Monday Check-in", enabled: true, schedule: "0 7 * * 1", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
    { id: "enzo-thursday", agentId: "enzo", name: "Thursday Pulse", enabled: true, schedule: "0 12 * * 4", lastRunAt: null, lastStatus: null, nextRunAt: null, lastDurationMs: null, consecutiveErrors: 0 },
  ];

  const byAgent: Record<string, CronSummary[]> = {};
  for (const job of jobs) {
    if (!byAgent[job.agentId]) byAgent[job.agentId] = [];
    byAgent[job.agentId].push(job);
  }

  return {
    jobs,
    byAgent,
    summary: {
      total: jobs.length,
      enabled: jobs.filter((j) => j.enabled).length,
      errors: jobs.filter((j) => j.consecutiveErrors > 0).length,
    },
  };
}
