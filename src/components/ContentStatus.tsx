"use client";

import { useEffect, useState } from "react";

interface ContentItem {
  label: string;
  type: string;
  status: "not-started" | "drafted" | "reviewed" | "published";
  source: string;
  lastUpdate: string | null;
}

interface ContentData {
  items: ContentItem[];
  fetchedAt: string;
}

const statusConfig = {
  "not-started": { label: "Not Started", color: "#555", bg: "bg-neutral-800/50" },
  drafted: { label: "Drafted", color: "#FBBF24", bg: "bg-yellow-500/10" },
  reviewed: { label: "Reviewed", color: "#60A5FA", bg: "bg-blue-500/10" },
  published: { label: "Published", color: "#4ADE80", bg: "bg-green-500/10" },
};

const typeIcons: Record<string, string> = {
  "pattern-card": "🃏",
  currents: "⚡",
  "challenge-lab": "🧪",
  "build-note": "🔨",
};

export default function ContentStatus() {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content-status")
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded w-full mb-2" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="text-red-400">Failed to load content status</p>
      </div>
    );
  }

  // Pipeline visualization: not-started → drafted → reviewed → published
  const pipelineSteps = ["not-started", "drafted", "reviewed", "published"] as const;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-white mb-4">
        📝 Content Pipeline
      </h2>

      <div className="space-y-3">
        {data.items.map((item) => {
          const config = statusConfig[item.status];
          const currentStep = pipelineSteps.indexOf(item.status);

          return (
            <div
              key={item.type}
              className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{typeIcons[item.type] || "📄"}</span>
                  <span className="text-sm font-medium text-neutral-200">
                    {item.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg}`}
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
              </div>

              {/* Mini pipeline */}
              <div className="flex gap-1">
                {pipelineSteps.map((step, i) => (
                  <div
                    key={step}
                    className="flex-1 h-1 rounded-full"
                    style={{
                      backgroundColor:
                        i <= currentStep
                          ? config.color
                          : "rgba(255,255,255,0.05)",
                    }}
                  />
                ))}
              </div>

              {item.lastUpdate && (
                <p className="text-[10px] text-neutral-600 mt-1">
                  Last update: {new Date(item.lastUpdate).toLocaleDateString()} via {item.source}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
