import { AGENTS, type AgentDef, type AgentSpend } from "@/lib/agents";

export type DashboardTab = "season" | "agents" | "content" | "metrics";

export interface SeasonResponse {
  season: {
    number: number;
    name: string;
    theme: string;
    description: string;
    color: string;
  };
  seasonYear: number;
  weekInSeason: number;
  weekInYear: number;
  pattern: {
    week: number;
    name: string;
    description: string;
  };
  challenge: {
    number: number;
    weeks: string;
    name: string;
    patterns: string;
    humanQuestion: string;
    practicalBuild: string;
  } | null;
  challengeWeekType: "challenge" | "open";
  challengeNumber: number;
  seasonProgress: number;
  daysUntilNextSeason: number;
  nextSeasonName: string;
  seasonStartDate: string;
  seasonEndDate: string;
}

export interface CronJobSummary {
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

export interface CronResponse {
  jobs: CronJobSummary[];
  byAgent: Record<string, CronJobSummary[]>;
  summary: {
    total: number;
    enabled: number;
    errors: number;
  };
  source: string;
  fetchedAt: string;
}

export interface WorkItem {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
  priority: string;
  venture: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkResponse {
  items: WorkItem[];
  byAgent: Record<string, WorkItem[]>;
  byStatus: Record<string, number>;
  total: number;
  fetchedAt?: string;
  error?: string;
}

export interface BeaconActivity {
  id: string;
  text: string;
  source: string;
  type: string;
  createdAt: string;
}

export interface BeaconResponse {
  totalThoughts: number;
  thisWeekThoughts: number;
  recent: BeaconActivity[];
  fetchedAt?: string;
  error?: string;
}

export interface ContentItem {
  label: string;
  type: "pattern-card" | "currents" | "challenge-lab" | "build-note";
  status: "not-started" | "drafted" | "reviewed" | "published";
  source: string;
  lastUpdate: string | null;
}

export interface ContentStatusResponse {
  items: ContentItem[];
  fetchedAt?: string;
  error?: string;
}

export interface PostizResponse {
  posts: Array<{
    id: string;
    content: string;
    status: string;
    scheduledDate: string | null;
    channel: string;
  }>;
  counts?: {
    scheduled: number;
    published: number;
    draft: number;
    thisWeek: number;
  };
  total: number;
  fetchedAt?: string;
  error?: string;
}

export interface SpendResponse {
  agents: AgentSpend[];
  totals: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  fetchedAt: string;
}

export interface AgentSnapshot extends AgentDef {
  spend: AgentSpend | null;
  jobs: CronJobSummary[];
  workItems: WorkItem[];
  activeWorkCount: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  hasErrors: boolean;
}

export const DASHBOARD_TABS: DashboardTab[] = [
  "season",
  "agents",
  "content",
  "metrics",
];

const ventureOrder: Record<AgentDef["venture"], number> = {
  Shared: 0,
  PE: 1,
  G2L: 2,
  Pidgeon: 3,
};

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function getSpendStatusColor(status?: string) {
  switch (status) {
    case "ok":
      return "#4ADE80";
    case "warning":
      return "#FBBF24";
    case "critical":
    case "error":
      return "#F87171";
    default:
      return "#666666";
  }
}

export function getWorkStatusClasses(status: string) {
  switch (status) {
    case "queued":
      return "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
    case "confirmed":
      return "bg-blue-500/10 text-blue-300 border-blue-500/20";
    case "in_progress":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "review":
      return "bg-violet-500/10 text-violet-300 border-violet-500/20";
    case "done":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "cancelled":
      return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    default:
      return "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
  }
}

export function getVentureClasses(venture: string) {
  switch (venture) {
    case "PE":
      return "bg-[#FF7D45]/10 text-[#FFB28F] border-[#FF7D45]/20";
    case "G2L":
      return "bg-[#DC97FF]/10 text-[#E8C6FF] border-[#DC97FF]/20";
    case "Pidgeon":
      return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    default:
      return "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
  }
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function formatDuration(value: number | null) {
  if (!value) {
    return "-";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  if (value < 60000) {
    return `${(value / 1000).toFixed(1)}s`;
  }

  return `${(value / 60000).toFixed(1)}m`;
}

export function sortWorkItems(items: WorkItem[]) {
  return [...items].sort((left, right) => {
    const priorityDelta =
      (priorityOrder[left.priority] ?? 99) - (priorityOrder[right.priority] ?? 99);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function buildAgentSnapshots(
  spend: SpendResponse | null,
  cron: CronResponse | null,
  work: WorkResponse | null
) {
  return AGENTS.filter((agent) => agent.id !== "default")
    .map((agent) => {
      const spendEntry = spend?.agents.find((entry) => entry.id === agent.id) || null;
      const jobs = [...(cron?.byAgent[agent.id] || [])].sort((left, right) => {
        const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
      const workItems = sortWorkItems(work?.byAgent[agent.id] || []);

      const lastRunAt =
        [...jobs]
          .filter((job) => job.lastRunAt)
          .sort(
            (left, right) =>
              new Date(right.lastRunAt || 0).getTime() -
              new Date(left.lastRunAt || 0).getTime()
          )[0]?.lastRunAt || null;

      const nextRunAt =
        [...jobs]
          .filter((job) => job.nextRunAt)
          .sort(
            (left, right) =>
              (left.nextRunAt ? new Date(left.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER) -
              (right.nextRunAt ? new Date(right.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER)
          )[0]?.nextRunAt || null;

      return {
        ...agent,
        spend: spendEntry,
        jobs,
        workItems,
        activeWorkCount: workItems.length,
        lastRunAt,
        nextRunAt,
        hasErrors: jobs.some(
          (job) => job.consecutiveErrors > 0 || job.lastStatus === "error"
        ),
      } satisfies AgentSnapshot;
    })
    .sort((left, right) => {
      const ventureDelta = ventureOrder[left.venture] - ventureOrder[right.venture];
      if (ventureDelta !== 0) {
        return ventureDelta;
      }

      return left.name.localeCompare(right.name);
    });
}
