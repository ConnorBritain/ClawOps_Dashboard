"use client";

import { useEffect, useState } from "react";
import { useRefresh } from "./RefreshProvider";

interface Activity {
  id: string;
  text: string;
  source: string;
  type: string;
  createdAt: string;
}

interface BeaconResponse {
  recent: Activity[];
}

const sourceColors: Record<string, string> = {
  dahlia: "#F472B6",
  "cyrus-pe": "#FF7D45",
  "cyrus-g2l": "#FF7D45",
  "cyrus-pidgeon": "#FF7D45",
  "echo-pe": "#60A5FA",
  "echo-g2l": "#60A5FA",
  "echo-pidgeon": "#60A5FA",
  enzo: "#4ADE80",
  "claude-code": "#DC97FF",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { refreshKey } = useRefresh();

  useEffect(() => {
    fetch("/api/beacon")
      .then((r) => r.json())
      .then((d: BeaconResponse) => {
        setActivities(d.recent || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-48 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/5 rounded w-full mb-2" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) return null;

  const visibleItems = expanded ? activities : activities.slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">🔔 Recent Activity</h2>
        <span className="text-xs text-neutral-500">Beacon feed</span>
      </div>

      <div className="space-y-2">
        {visibleItems.map((a) => (
          <div
            key={a.id}
            className="flex gap-3 py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            {/* Source indicator */}
            <div className="shrink-0 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: sourceColors[a.source] || "#666" }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                {a.text}
              </p>
            </div>

            {/* Meta */}
            <div className="shrink-0 text-right">
              <p
                className="text-[10px] font-medium"
                style={{ color: sourceColors[a.source] || "#666" }}
              >
                {a.source}
              </p>
              <p className="text-[10px] text-neutral-600">
                {timeAgo(a.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {activities.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors w-full text-center"
        >
          {expanded ? "Show less" : `Show ${activities.length - 5} more`}
        </button>
      )}
    </div>
  );
}
