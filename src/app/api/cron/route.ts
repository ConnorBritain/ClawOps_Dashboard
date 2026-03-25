import { NextResponse } from "next/server";

export const revalidate = 900; // 15 min cache

// The cron data will be populated from a snapshot file that Cyrus updates
// via a cron job or heartbeat. For now, we read from a static JSON file
// that gets refreshed by the VPS agent.
//
// In production, we could also hit the OpenClaw gateway API directly
// if it's accessible from Vercel (it won't be since it's Tailscale-only).
// So we use a snapshot approach: a cron job writes the state to Supabase
// or a public endpoint.

// For MVP: hardcode the cron data from what we know
// TODO: Add a /api/cron/refresh endpoint that the VPS calls to update

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  nextRunAt: string | null;
  consecutiveErrors: number;
}

// Static snapshot from the actual cron list (refreshed by agent)
const CRON_SNAPSHOT: CronJob[] = [
  { id: "dahlia-eod", agentId: "dahlia", name: "EOD Synthesis", enabled: true, schedule: "21:00 M-F", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "dahlia-morning", agentId: "dahlia", name: "Morning Orchestrator", enabled: true, schedule: "06:30 M-F", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "dahlia-content", agentId: "dahlia", name: "Weekly Content Check", enabled: true, schedule: "09:00 Mon", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "dahlia-review", agentId: "dahlia", name: "Weekly Review", enabled: true, schedule: "19:00 Sun", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "repo-sync", agentId: "dahlia", name: "Repo Sync", enabled: true, schedule: "05:00 daily", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "cyrus-pe-work", agentId: "cyrus-pe", name: "Work Check", enabled: true, schedule: "08:00 M-F", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "cyrus-g2l-work", agentId: "cyrus-g2l", name: "Work Check", enabled: true, schedule: "08:00 M-F", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "cyrus-pidgeon-work", agentId: "cyrus-pidgeon", name: "Work Check", enabled: true, schedule: "08:00 M-F", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-pe-weekly", agentId: "echo-pe", name: "Weekly Plan", enabled: true, schedule: "10:00 Mon", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-pe-midweek", agentId: "echo-pe", name: "Mid-week Check", enabled: true, schedule: "10:00 Wed", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-g2l-challenge", agentId: "echo-g2l", name: "Challenge Plan", enabled: true, schedule: "10:30 Mon", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-g2l-currents", agentId: "echo-g2l", name: "Currents", enabled: true, schedule: "09:00 Tue", lastRunAt: null, lastStatus: "ok", nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-g2l-friday", agentId: "echo-g2l", name: "Friday Recap", enabled: true, schedule: "15:00 Fri", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "echo-pidgeon-newsletter", agentId: "echo-pidgeon", name: "Newsletter", enabled: true, schedule: "10:00 biweekly Mon", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "enzo-monday", agentId: "enzo", name: "Monday Check-in", enabled: true, schedule: "07:00 Mon", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
  { id: "enzo-thursday", agentId: "enzo", name: "Thursday Pulse", enabled: true, schedule: "12:00 Thu", lastRunAt: null, lastStatus: null, nextRunAt: null, consecutiveErrors: 0 },
];

export async function GET() {
  // Group by agent
  const byAgent: Record<string, CronJob[]> = {};
  for (const job of CRON_SNAPSHOT) {
    if (!byAgent[job.agentId]) byAgent[job.agentId] = [];
    byAgent[job.agentId].push(job);
  }

  const totalJobs = CRON_SNAPSHOT.length;
  const enabledJobs = CRON_SNAPSHOT.filter((j) => j.enabled).length;
  const errorJobs = CRON_SNAPSHOT.filter((j) => j.consecutiveErrors > 0).length;

  return NextResponse.json({
    jobs: CRON_SNAPSHOT,
    byAgent,
    summary: {
      total: totalJobs,
      enabled: enabledJobs,
      errors: errorJobs,
    },
    fetchedAt: new Date().toISOString(),
  });
}
