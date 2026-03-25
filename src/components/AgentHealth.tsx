"use client";

import { useEffect, useState } from "react";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: string;
  lastStatus: string | null;
  consecutiveErrors: number;
}

interface CronData {
  byAgent: Record<string, CronJob[]>;
  summary: { total: number; enabled: number; errors: number };
}

const agentEmoji: Record<string, string> = {
  dahlia: "🌸",
  "cyrus-pe": "🦅",
  "cyrus-g2l": "🦅",
  "cyrus-pidgeon": "🦅",
  "echo-pe": "🔊",
  "echo-g2l": "🔊",
  "echo-pidgeon": "🔊",
  enzo: "🧘",
};

const agentDisplayName: Record<string, string> = {
  dahlia: "Dahlia",
  "cyrus-pe": "Cyrus PE",
  "cyrus-g2l": "Cyrus G2L",
  "cyrus-pidgeon": "Cyrus Pidgeon",
  "echo-pe": "Echo PE",
  "echo-g2l": "Echo G2L",
  "echo-pidgeon": "Echo Pidgeon",
  enzo: "Enzo",
};

export default function AgentHealth() {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cron")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">🤖 Agent Health</h2>
        <div className="flex gap-3 text-xs text-neutral-400">
          <span>
            <span className="text-green-400">{data.summary.enabled}</span> active
          </span>
          <span>
            <span className={data.summary.errors > 0 ? "text-red-400" : "text-neutral-600"}>
              {data.summary.errors}
            </span>{" "}
            errors
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {Object.entries(data.byAgent).map(([agentId, jobs]) => {
          const hasErrors = jobs.some((j) => j.consecutiveErrors > 0);
          const jobCount = jobs.length;
          const isExpanded = expanded === agentId;

          return (
            <div key={agentId}>
              <button
                onClick={() => setExpanded(isExpanded ? null : agentId)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
              >
                <span>{agentEmoji[agentId] || "🔷"}</span>
                <div className="flex-1">
                  <span className="text-sm text-neutral-200">
                    {agentDisplayName[agentId] || agentId}
                  </span>
                </div>
                <span className="text-xs text-neutral-500">
                  {jobCount} job{jobCount !== 1 ? "s" : ""}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: hasErrors ? "#F87171" : "#4ADE80",
                  }}
                />
                <span className="text-xs text-neutral-600">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-8 mt-1 space-y-1 mb-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-white/[0.02]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            job.consecutiveErrors > 0
                              ? "#F87171"
                              : job.lastStatus === "ok"
                              ? "#4ADE80"
                              : "#555",
                        }}
                      />
                      <span className="text-neutral-400 flex-1 truncate">
                        {job.name}
                      </span>
                      <span className="text-neutral-600">{job.schedule}</span>
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
