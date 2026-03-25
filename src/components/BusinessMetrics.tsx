"use client";

import { useEffect, useState } from "react";

interface BeaconData {
  totalThoughts: number;
  thisWeekThoughts: number;
  fetchedAt: string;
}

interface SpendTotals {
  daily: number;
  weekly: number;
  monthly: number;
}

export default function BusinessMetrics() {
  const [beacon, setBeacon] = useState<BeaconData | null>(null);
  const [spend, setSpend] = useState<SpendTotals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/beacon").then((r) => r.json()),
      fetch("/api/spend").then((r) => r.json()),
    ])
      .then(([b, s]) => {
        setBeacon(b);
        setSpend(s.totals);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "OpenRouter (Week)",
      value: spend ? `$${spend.weekly.toFixed(2)}` : "—",
      sub: spend ? `$${spend.monthly.toFixed(2)} this month` : "",
      icon: "⚡",
      color: "#FF7D45",
    },
    {
      label: "Beacon Thoughts",
      value: beacon ? beacon.totalThoughts.toLocaleString() : "—",
      sub: beacon ? `+${beacon.thisWeekThoughts} this week` : "",
      icon: "🧠",
      color: "#DC97FF",
    },
    {
      label: "Cron Jobs",
      value: "16",
      sub: "0 errors",
      icon: "⏰",
      color: "#4ADE80",
    },
    {
      label: "Agent Fleet",
      value: "8",
      sub: "3 ventures",
      icon: "🤖",
      color: "#60A5FA",
    },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        📊 Business Metrics
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{m.icon}</span>
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                {m.label}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: m.color }}>
              {m.value}
            </p>
            {m.sub && (
              <p className="text-[10px] text-neutral-500 mt-0.5">{m.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
