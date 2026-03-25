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
  { id: "cyrus-pattern-morning-planning", agentId: "cyrus-pe", name: "Morning Planning", expr: "0 7 * * 1-5" },
  { id: "cyrus-pattern-end-of-day-report", agentId: "cyrus-pe", name: "End-of-day Report", expr: "0 22 * * *" },
  { id: "cyrus-pattern-weekly-dependency-check", agentId: "cyrus-pe", name: "Weekly Dependency Check", expr: "0 10 * * 1" },
  { id: "cyrus-pidgeon-morning-planning", agentId: "cyrus-pidgeon", name: "Morning Planning", expr: "0 7 * * 1-5" },
  { id: "cyrus-pidgeon-end-of-day-report", agentId: "cyrus-pidgeon", name: "End-of-day Report", expr: "0 22 * * *" },
  { id: "cyrus-pidgeon-weekly-dependency-check", agentId: "cyrus-pidgeon", name: "Weekly Dependency Check", expr: "0 10 * * 1" },
  { id: "cyrus-g2l-morning-planning", agentId: "cyrus-g2l", name: "Morning Planning", expr: "0 7 * * 1-5" },
  { id: "cyrus-g2l-end-of-day-report", agentId: "cyrus-g2l", name: "End-of-day Report", expr: "0 22 * * *" },
  { id: "cyrus-g2l-weekly-dependency-check", agentId: "cyrus-g2l", name: "Weekly Dependency Check", expr: "0 10 * * 1" },
  { id: "cyrus-g2l-skool-stats", agentId: "cyrus-g2l", name: "Skool Stats", expr: "0 8,18 * * *" },
  { id: "echo-pattern-monday-content-planning", agentId: "echo-pe", name: "Monday Content Planning", expr: "0 8 * * 1" },
  { id: "echo-pattern-daily-content-check", agentId: "echo-pe", name: "Daily Content Check", expr: "0 9 * * 1-5" },
  { id: "echo-pattern-performance-review", agentId: "echo-pe", name: "Performance Review", expr: "0 16 * * 5" },
  { id: "echo-pattern-stale-draft-check", agentId: "echo-pe", name: "Stale Draft Check", expr: "0 14 * * 3" },
  { id: "echo-pidgeon-monday-content-planning", agentId: "echo-pidgeon", name: "Monday Content Planning", expr: "0 8 * * 1" },
  { id: "echo-pidgeon-daily-content-check", agentId: "echo-pidgeon", name: "Daily Content Check", expr: "0 9 * * 1-5" },
  { id: "echo-pidgeon-performance-review", agentId: "echo-pidgeon", name: "Performance Review", expr: "0 16 * * 5" },
  { id: "echo-pidgeon-stale-draft-check", agentId: "echo-pidgeon", name: "Stale Draft Check", expr: "0 14 * * 3" },
  { id: "echo-g2l-monday-content-planning", agentId: "echo-g2l", name: "Monday Content Planning", expr: "0 8 * * 1" },
  { id: "echo-g2l-daily-content-check", agentId: "echo-g2l", name: "Daily Content Check", expr: "0 9 * * 1-5" },
  { id: "echo-g2l-performance-review", agentId: "echo-g2l", name: "Performance Review", expr: "0 16 * * 5" },
  { id: "echo-g2l-stale-draft-check", agentId: "echo-g2l", name: "Stale Draft Check", expr: "0 14 * * 3" },
  { id: "dahlia-morning-brief", agentId: "dahlia", name: "Morning Brief", expr: "0 7 * * *" },
  { id: "dahlia-weekly-priority-review", agentId: "dahlia", name: "Weekly Priority Review", expr: "0 9 * * 1" },
  { id: "dahlia-sunday-relationship-check", agentId: "dahlia", name: "Sunday Relationship Check", expr: "0 18 * * 0" },
  { id: "dahlia-weekly-synthesis", agentId: "dahlia", name: "Weekly Synthesis", expr: "0 19 * * 0" },
  { id: "enzo-daily-check-in", agentId: "enzo", name: "Daily Check-in", expr: "0 7 * * *" },
  { id: "enzo-monday-time-block-rebuild", agentId: "enzo", name: "Monday Time-block Rebuild", expr: "0 8 * * 1" },
  { id: "enzo-midday-habit-check", agentId: "enzo", name: "Midday Habit Check", expr: "0 12 * * 1-5" },
  { id: "enzo-end-of-day-review", agentId: "enzo", name: "End-of-day Review", expr: "0 21 * * *" },
  { id: "enzo-weekly-review", agentId: "enzo", name: "Weekly Review", expr: "0 18 * * 5" },
  { id: "enzo-monthly-retrospective", agentId: "enzo", name: "Monthly Retrospective", expr: "0 10 1 * *" },
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

function normalizeCronKey(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
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

function findKnownCron(agentId: string, id: string, name?: string, expr?: string) {
  const candidates = [id, name]
    .filter((value): value is string => Boolean(value))
    .map(normalizeCronKey);

  return STATIC_CRON_DEFINITIONS.find((job) => {
    if (
      job.agentId === agentId &&
      candidates.some(
        (candidate) =>
          candidate === normalizeCronKey(job.id) ||
          candidate === normalizeCronKey(job.name)
      )
    ) {
      return true;
    }

    return Boolean(expr && job.agentId === agentId && job.expr === expr);
  });
}

function buildCronSummary(job: CronJob): CronSummary | null {
  const expr = job.schedule.kind === "cron" ? job.schedule.expr : undefined;
  const known = findKnownCron(job.agentId, job.id, job.name, expr);
  if (!known) {
    return null;
  }

  return {
    id: known.id,
    agentId: job.agentId,
    name: known.name,
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
      const summary = jobs
        .map(buildCronSummary)
        .filter((job): job is CronSummary => Boolean(job));

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
          const mapped = snapshotJobs
            .map((j): CronSummary | null => {
              const expr = String(j.schedule || "");
              const agentId = String(j.agent || "");
              const rawName = String(j.name || "");
              const known = findKnownCron(agentId, rawName, rawName, expr);
              if (!known) {
                return null;
              }

              return {
                id: known.id,
                agentId,
                name: known.name,
                enabled: j.enabled !== false,
                schedule: expr ? formatCronExpression(expr) : "unknown",
                lastRunAt: j.lastRunAt
                  ? new Date(Number(j.lastRunAt)).toISOString()
                  : null,
                lastStatus: j.lastStatus === "never" ? null : String(j.lastStatus || ""),
                nextRunAt: j.nextRunAt
                  ? new Date(Number(j.nextRunAt)).toISOString()
                  : expr
                    ? getNextRunAt(expr)
                    : null,
                lastDurationMs: j.lastDuration ? Number(j.lastDuration) : null,
                consecutiveErrors: Number(j.errors || 0),
              };
            })
            .filter((job): job is CronSummary => Boolean(job));

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
