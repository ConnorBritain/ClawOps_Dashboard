"use client";

import { useEffect, useState } from "react";
import { useRefresh } from "./RefreshProvider";

interface CronJob {
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

interface CronData {
  byAgent: Record<string, CronJob[]>;
  summary: { total: number; enabled: number; errors: number };
  source: string;
}

const agentMeta: Record<string, { emoji: string; name: string; venture: string }> = {
  dahlia: { emoji: "🌸", name: "Dahlia", venture: "Shared" },
  "cyrus-pe": { emoji: "🦅", name: "Cyrus PE", venture: "PE" },
  "cyrus-g2l": { emoji: "🦅", name: "Cyrus G2L", venture: "G2L" },
  "cyrus-pidgeon": { emoji: "🦅", name: "Cyrus Pidgeon", venture: "Pidgeon" },
  "echo-pe": { emoji: "🔊", name: "Echo PE", venture: "PE" },
  "echo-g2l": { emoji: "🔊", name: "Echo G2L", venture: "G2L" },
  "echo-pidgeon": { emoji: "🔊", name: "Echo Pidgeon", venture: "Pidgeon" },
  enzo: { emoji: "🧘", name: "Enzo", venture: "Shared" },
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export default function AgentHealth() {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { refreshKey } = useRefresh();

  useEffect(() => {
    fetch("/api/cron")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-48 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded w-full mb-2" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="text-red-400">Failed to load agent health</p>
      </div>
    );
  }

  // Sort agents: shared first, then by venture
  const sortedAgents = Object.entries(data.byAgent).sort(([a], [b]) => {
    const va = agentMeta[a]?.venture || "Z";
    const vb = agentMeta[b]?.venture || "Z";
    if (va === "Shared" && vb !== "Shared") return -1;
    if (vb === "Shared" && va !== "Shared") return 1;
    return va.localeCompare(vb);
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">🤖 Agent Fleet</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs text-neutral-400">
            <span>
              <span className="text-green-400">{data.summary.enabled}</span> jobs
            </span>
            {data.summary.errors > 0 && (
              <span>
                <span className="text-red-400">{data.summary.errors}</span> errors
              </span>
            )}
          </div>
          {data.source === "live" && (
            <span className="text-[10px] text-green-500/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
              live
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {sortedAgents.map(([agentId, jobs]) => {
          const meta = agentMeta[agentId] || { emoji: "🔷", name: agentId, venture: "?" };
          const hasErrors = jobs.some((j) => j.consecutiveErrors > 0);
          const allOk = jobs.every((j) => j.lastStatus === "ok" || !j.lastStatus);
          const isExpanded = expanded === agentId;

          return (
            <div key={agentId}>
              <button
                onClick={() => setExpanded(isExpanded ? null : agentId)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
              >
                <span className="text-base">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-200">
                      {meta.name}
                    </span>
                    <span className="text-[10px] text-neutral-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                      {meta.venture}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-neutral-500">
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </span>
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: hasErrors
                      ? "#F87171"
                      : allOk
                      ? "#4ADE80"
                      : "#FBBF24",
                  }}
                />
                <svg
                  className={`w-3 h-3 text-neutral-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="ml-9 mt-1 space-y-1 mb-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-md bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            job.consecutiveErrors > 0
                              ? "#F87171"
                              : job.lastStatus === "ok"
                              ? "#4ADE80"
                              : "#555",
                        }}
                      />
                      <span className="text-neutral-300 flex-1 truncate font-medium">
                        {job.name}
                      </span>
                      <span className="text-neutral-600 shrink-0" title="Cron schedule">
                        {job.schedule}
                      </span>
                      {job.lastDurationMs && (
                        <span className="text-neutral-600 shrink-0" title="Last duration">
                          {formatDuration(job.lastDurationMs)}
                        </span>
                      )}
                      {job.lastRunAt && (
                        <span className="text-neutral-500 shrink-0" title={`Last run: ${job.lastRunAt}`}>
                          {timeAgo(job.lastRunAt)}
                        </span>
                      )}
                      {job.nextRunAt && (
                        <span className="text-neutral-500 shrink-0" title={`Next run: ${job.nextRunAt}`}>
                          → {timeUntil(job.nextRunAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
