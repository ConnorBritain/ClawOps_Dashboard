import { NextResponse } from "next/server";
import { CENTRAL_TIME_ZONE, getCentralDateParts } from "@/lib/time";

export const revalidate = 60;

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

interface StaticCronDefinition {
  id: string;
  agentId: string;
  name: string;
  expr: string;
}

const STATIC_CRON_DEFINITIONS: StaticCronDefinition[] = [
  { id: "dahlia-morning", agentId: "dahlia", name: "Morning Orchestrator", expr: "30 6 * * 1-5" },
  { id: "dahlia-weekly-check", agentId: "dahlia", name: "Weekly Content Check", expr: "0 9 * * 1" },
  { id: "dahlia-eod", agentId: "dahlia", name: "EOD Synthesis", expr: "0 21 * * 1-5" },
  { id: "dahlia-review", agentId: "dahlia", name: "Weekly Review", expr: "0 19 * * 0" },
  { id: "enzo-monday", agentId: "enzo", name: "Monday Check-in", expr: "0 7 * * 1" },
  { id: "enzo-thursday", agentId: "enzo", name: "Thursday Pulse", expr: "0 12 * * 4" },
  { id: "cyrus-pe-work", agentId: "cyrus-pe", name: "Work Queue Check", expr: "0 8 * * 1-5" },
  { id: "cyrus-g2l-work", agentId: "cyrus-g2l", name: "Work Queue Check", expr: "0 8 * * 1-5" },
  { id: "cyrus-pidgeon-work", agentId: "cyrus-pidgeon", name: "Work Queue Check", expr: "0 8 * * 1-5" },
  { id: "echo-pe-weekly", agentId: "echo-pe", name: "Weekly Content Plan", expr: "0 10 * * 1" },
  { id: "echo-pe-midweek", agentId: "echo-pe", name: "Mid-week Check", expr: "0 10 * * 3" },
  { id: "echo-g2l-currents", agentId: "echo-g2l", name: "Currents Newsletter", expr: "0 9 * * 2" },
  { id: "echo-g2l-challenge", agentId: "echo-g2l", name: "Challenge Lab Plan", expr: "30 10 * * 1" },
  { id: "echo-g2l-friday", agentId: "echo-g2l", name: "Friday Recap", expr: "0 15 * * 5" },
  { id: "haven-daily", agentId: "haven", name: "Daily Household Sweep", expr: "0 7 * * *" },
  { id: "haven-sunday", agentId: "haven", name: "Sunday Family Review", expr: "0 19 * * 0" },
  { id: "atlas-monday", agentId: "atlas", name: "Weekly Navigation Review", expr: "0 6 * * 1" },
  { id: "atlas-thursday", agentId: "atlas", name: "Thursday Course Correct", expr: "0 20 * * 4" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimestamp(ms: number | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  });
  const offsetPart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetPart || offsetPart === "GMT") {
    return 0;
  }

  const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours * 60 + minutes);
}

function zonedTimeToUtc(
  parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string
) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0
  );

  const firstPassOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const firstPassDate = new Date(utcGuess - firstPassOffset * 60000);
  const secondPassOffset = getTimeZoneOffsetMinutes(firstPassDate, timeZone);

  if (secondPassOffset === firstPassOffset) {
    return firstPassDate;
  }

  return new Date(utcGuess - secondPassOffset * 60000);
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseNumberSet(value: string): number[] | null {
  if (value === "*") {
    return null;
  }

  const expanded = value
    .split(",")
    .flatMap((segment) => {
      if (segment.includes("-")) {
        const [start, end] = segment.split("-").map(Number);
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
      }

      return [Number(segment)];
    })
    .filter((entry) => Number.isFinite(entry));

  return expanded.length > 0 ? expanded : null;
}

function parseCronExpression(expr: string) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  const [minuteRaw, hourRaw, dayOfMonthRaw, monthRaw, dayOfWeekRaw] = parts;
  if (monthRaw !== "*") {
    return null;
  }

  const minute = Number(minuteRaw);
  const hour = Number(hourRaw);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) {
    return null;
  }

  return {
    minute,
    hour,
    dayOfMonth: parseNumberSet(dayOfMonthRaw),
    dayOfWeek: parseNumberSet(dayOfWeekRaw),
  };
}

function matchesSchedule(
  schedule: ReturnType<typeof parseCronExpression>,
  candidateDate: Date
) {
  if (!schedule) {
    return false;
  }

  const weekday = candidateDate.getUTCDay();
  const dayOfMonth = candidateDate.getUTCDate();

  const matchesDayOfMonth = !schedule.dayOfMonth || schedule.dayOfMonth.includes(dayOfMonth);
  const matchesDayOfWeek = !schedule.dayOfWeek || schedule.dayOfWeek.includes(weekday);

  return matchesDayOfMonth && matchesDayOfWeek;
}

function getNextRunAt(expr: string, timeZone = CENTRAL_TIME_ZONE, now = new Date()) {
  const schedule = parseCronExpression(expr);
  if (!schedule) {
    return null;
  }

  const currentParts = getCentralDateParts(now);
  const startDate = new Date(
    Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day)
  );

  for (let offset = 0; offset < 45; offset += 1) {
    const candidateDate = new Date(startDate.getTime());
    candidateDate.setUTCDate(candidateDate.getUTCDate() + offset);

    if (!matchesSchedule(schedule, candidateDate)) {
      continue;
    }

    const candidateUtc = zonedTimeToUtc(
      {
        year: candidateDate.getUTCFullYear(),
        month: candidateDate.getUTCMonth() + 1,
        day: candidateDate.getUTCDate(),
        hour: schedule.hour,
        minute: schedule.minute,
      },
      timeZone
    );

    if (candidateUtc.getTime() > now.getTime()) {
      return candidateUtc.toISOString();
    }
  }

  return null;
}

function formatDayRange(days: number[] | null) {
  if (!days || days.length === 7) {
    return "Daily";
  }

  const normalized = Array.from(new Set(days)).sort((left, right) => left - right);
  if (normalized.length === 5 && normalized.join(",") === "1,2,3,4,5") {
    return "Mon-Fri";
  }

  if (normalized.length === 1) {
    return WEEKDAY_LABELS[normalized[0]];
  }

  return normalized.map((day) => WEEKDAY_LABELS[day]).join(", ");
}

function formatCronExpression(expr: string) {
  const schedule = parseCronExpression(expr);
  if (!schedule) {
    return expr;
  }

  const date = new Date(Date.UTC(2026, 0, 1, schedule.hour, schedule.minute));
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  const dayLabel = formatDayRange(schedule.dayOfWeek);

  if (dayLabel === "Daily") {
    return `${timeLabel} Daily`;
  }

  if (schedule.dayOfMonth?.length) {
    return `${timeLabel} ${dayLabel} · days ${schedule.dayOfMonth.join(",")}`;
  }

  return `${timeLabel} ${dayLabel}`;
}

function findKnownCron(agentId: string, id: string, expr?: string) {
  return STATIC_CRON_DEFINITIONS.find((job) => {
    if (job.id === id) {
      return true;
    }

    return Boolean(expr && job.agentId === agentId && job.expr === expr);
  });
}

function buildCronSummary(job: CronJob): CronSummary {
  const expr = job.schedule.kind === "cron" ? job.schedule.expr : undefined;
  const known = findKnownCron(job.agentId, job.id, expr);
  const displayName =
    job.name && !isUuidLike(job.name)
      ? job.name
      : known?.name || (isUuidLike(job.id) ? "Scheduled job" : job.id);

  return {
    id: known?.id || job.id,
    agentId: job.agentId,
    name: displayName,
    enabled: job.enabled,
    schedule: expr ? formatCronExpression(expr) : job.schedule.kind,
    lastRunAt: formatTimestamp(job.state?.lastRunAtMs),
    lastStatus: job.state?.lastStatus || job.state?.lastRunStatus || null,
    nextRunAt:
      formatTimestamp(job.state?.nextRunAtMs) ||
      (expr ? getNextRunAt(expr, job.schedule.tz || CENTRAL_TIME_ZONE) : null),
    lastDurationMs: job.state?.lastDurationMs || null,
    consecutiveErrors: job.state?.consecutiveErrors || 0,
  };
}

function buildResponse(jobs: CronSummary[]) {
  const byAgent: Record<string, CronSummary[]> = {};
  for (const job of jobs) {
    if (!byAgent[job.agentId]) {
      byAgent[job.agentId] = [];
    }

    byAgent[job.agentId].push(job);
  }

  return {
    jobs,
    byAgent,
    summary: {
      total: jobs.length,
      enabled: jobs.filter((job) => job.enabled).length,
      errors: jobs.filter((job) => job.consecutiveErrors > 0).length,
    },
  };
}

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/cron/jobs`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN || ""}`,
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const jobs: CronJob[] = Array.isArray(data.jobs) ? data.jobs : [];
      const summary = jobs.map(buildCronSummary);

      return NextResponse.json({
        ...buildResponse(summary),
        source: "live",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Gateway not reachable — fall back to static
  }

  // Try Supabase cron snapshot (pushed by VPS cron-snapshot script)
  try {
    const supabaseUrl = process.env.BEACON_SUPABASE_URL;
    const supabaseKey = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const snapRes = await fetch(
        `${supabaseUrl}/rest/v1/cron_snapshots?id=eq.latest&select=data,updated_at`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (snapRes.ok) {
        const snapRows = await snapRes.json();
        if (snapRows?.[0]?.data?.jobs) {
          const snapshotJobs = snapRows[0].data.jobs as Array<Record<string, unknown>>;
          const mapped: CronSummary[] = snapshotJobs.map((j) => {
            const expr = String(j.schedule || "");
            const known = STATIC_CRON_DEFINITIONS.find(
              (d) => d.agentId === j.agent && d.expr === expr
            );
            return {
              id: known?.id || String(j.name),
              agentId: String(j.agent),
              name: known?.name || String(j.name).replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              enabled: j.enabled !== false,
              schedule: expr ? formatCronExpression(expr) : "unknown",
              lastRunAt: j.lastRunAt ? new Date(Number(j.lastRunAt)).toISOString() : null,
              lastStatus: j.lastStatus === "never" ? null : String(j.lastStatus || ""),
              nextRunAt: j.nextRunAt ? new Date(Number(j.nextRunAt)).toISOString() : (expr ? getNextRunAt(expr) : null),
              lastDurationMs: j.lastDuration ? Number(j.lastDuration) : null,
              consecutiveErrors: Number(j.errors || 0),
            };
          });
          return NextResponse.json({
            ...buildResponse(mapped),
            source: "supabase",
            snapshotAt: snapRows[0].updated_at,
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Supabase snapshot not available
  }

  // Final fallback: static schedule (no run data)
  return NextResponse.json({
    ...getFallbackData(),
    source: "static",
    fetchedAt: new Date().toISOString(),
  });
}

function getFallbackData() {
  return buildResponse(
    STATIC_CRON_DEFINITIONS.map((job) => ({
      id: job.id,
      agentId: job.agentId,
      name: job.name,
      enabled: true,
      schedule: formatCronExpression(job.expr),
      lastRunAt: null,
      lastStatus: null,
      nextRunAt: getNextRunAt(job.expr),
      lastDurationMs: null,
      consecutiveErrors: 0,
    }))
  );
}
