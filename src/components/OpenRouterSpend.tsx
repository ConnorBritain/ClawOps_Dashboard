"use client";

import { useEffect, useState } from "react";
import type { AgentSpend } from "@/lib/agents";

interface SpendData {
  agents: AgentSpend[];
  totals: { daily: number; weekly: number; monthly: number };
  fetchedAt: string;
}

function statusColor(status: string) {
  switch (status) {
    case "ok":
      return "#4ADE80";
    case "warning":
      return "#FBBF24";
    case "critical":
      return "#F87171";
    default:
      return "#666";
  }
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function OpenRouterSpend() {
  const [data, setData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/spend")
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
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/5 rounded w-full mb-2" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="text-red-400">Failed to load spend data</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          💰 OpenRouter Spend
        </h2>
        <div className="text-right">
          <p className="text-xs text-neutral-500">This week</p>
          <p className="text-lg font-bold" style={{ color: "#FF7D45" }}>
            {formatUSD(data.totals.weekly)}
          </p>
        </div>
      </div>

      {/* Total summary bar */}
      <div className="flex gap-4 mb-4 text-xs text-neutral-400">
        <span>Today: {formatUSD(data.totals.daily)}</span>
        <span>Week: {formatUSD(data.totals.weekly)}</span>
        <span>Month: {formatUSD(data.totals.monthly)}</span>
      </div>

      {/* Agent rows */}
      <div className="space-y-2">
        {data.agents
          .filter((a) => a.id !== "default")
          .sort((a, b) => b.weekly - a.weekly)
          .map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-sm">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300 truncate">
                    {agent.name}
                  </span>
                  <span className="text-xs text-neutral-500 ml-2">
                    {agent.venture}
                  </span>
                </div>
                {/* Usage bar */}
                {agent.limit && (
                  <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(agent.usagePercent, 100)}%`,
                        backgroundColor: statusColor(agent.status),
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="text-right ml-2 shrink-0">
                <p className="text-sm font-medium text-neutral-200">
                  {formatUSD(agent.weekly)}
                </p>
                {agent.limit && (
                  <p className="text-[10px] text-neutral-500">
                    / {formatUSD(agent.limit)} {agent.limitReset}
                  </p>
                )}
              </div>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor(agent.status) }}
              />
            </div>
          ))}
      </div>

      {/* Last updated */}
      <p className="text-[10px] text-neutral-600 mt-3 text-right">
        Updated {new Date(data.fetchedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
