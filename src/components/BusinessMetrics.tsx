"use client";

import { useEffect, useState } from "react";
import { useRefresh } from "./RefreshProvider";

interface BeaconData {
  totalThoughts: number;
  thisWeekThoughts: number;
}

interface SpendTotals {
  daily: number;
  weekly: number;
  monthly: number;
}

interface PostizCounts {
  scheduled: number;
  published: number;
  draft: number;
  thisWeek: number;
}

interface CronSummary {
  total: number;
  enabled: number;
  errors: number;
}

export default function BusinessMetrics() {
  const [beacon, setBeacon] = useState<BeaconData | null>(null);
  const [spend, setSpend] = useState<SpendTotals | null>(null);
  const [postiz, setPostiz] = useState<PostizCounts | null>(null);
  const [cron, setCron] = useState<CronSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useRefresh();

  useEffect(() => {
    Promise.all([
      fetch("/api/beacon").then((r) => r.json()).catch(() => null),
      fetch("/api/spend").then((r) => r.json()).catch(() => null),
      fetch("/api/postiz").then((r) => r.json()).catch(() => null),
      fetch("/api/cron").then((r) => r.json()).catch(() => null),
    ])
      .then(([b, s, p, c]) => {
        if (b && !b.error) setBeacon(b);
        if (s?.totals) setSpend(s.totals);
        if (p?.counts) setPostiz(p.counts);
        if (c?.summary) setCron(c.summary);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "OpenRouter",
      value: spend ? `$${spend.weekly.toFixed(2)}` : "—",
      sub: spend ? `$${spend.monthly.toFixed(2)}/mo · $${spend.daily.toFixed(2)} today` : "",
      icon: "⚡",
      color: "#FF7D45",
    },
    {
      label: "Beacon",
      value: beacon ? beacon.totalThoughts.toLocaleString() : "—",
      sub: beacon ? `+${beacon.thisWeekThoughts} this week` : "",
      icon: "🧠",
      color: "#DC97FF",
    },
    {
      label: "Social Posts",
      value: postiz ? `${postiz.thisWeek}` : "—",
      sub: postiz
        ? `${postiz.scheduled} scheduled · ${postiz.published} published`
        : "Postiz connected",
      icon: "📱",
      color: "#60A5FA",
    },
    {
      label: "Cron Jobs",
      value: cron ? `${cron.enabled}` : "—",
      sub: cron
        ? cron.errors > 0
          ? `⚠️ ${cron.errors} with errors`
          : "All healthy"
        : "",
      icon: "⏰",
      color: "#4ADE80",
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
            className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06] hover:border-white/[0.1] transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{m.icon}</span>
              <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium">
                {m.label}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: m.color }}>
              {m.value}
            </p>
            {m.sub && (
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                {m.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
