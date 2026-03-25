"use client";

import { useEffect, useState } from "react";
import type { SeasonState } from "@/lib/seasons";
import { useRefresh } from "./RefreshProvider";

function SeasonIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    Signal: "📡",
    Systems: "⚙️",
    Machines: "🤖",
    Stewardship: "🛡️",
  };
  return <span className="text-2xl">{icons[name] || "🔷"}</span>;
}

export default function SeasonTracker() {
  const [state, setState] = useState<SeasonState | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshKey } = useRefresh();

  useEffect(() => {
    fetch("/api/season")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-48 mb-4" />
        <div className="h-4 bg-white/5 rounded w-full mb-2" />
        <div className="h-4 bg-white/5 rounded w-3/4" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="card">
        <p className="text-red-400">Failed to load season data</p>
      </div>
    );
  }

  const progressPercent = Math.round(state.seasonProgress * 100);
  const isPreLaunch = state.weekInSeason === 0;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SeasonIcon name={state.season.name} />
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isPreLaunch
                ? "Season 1: Signal — Launching Soon"
                : `Season ${state.season.number}: ${state.season.name}`}
            </h2>
            <p className="text-sm text-neutral-400">
              {isPreLaunch
                ? `Year 1 · Starts April 1, 2026`
                : `Year ${state.seasonYear} · Week ${state.weekInSeason} of 13`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">
            {isPreLaunch ? "Countdown" : "Next season"}
          </p>
          <p className="text-sm font-medium" style={{ color: isPreLaunch ? "#FF7D45" : "#DC97FF" }}>
            {isPreLaunch
              ? `${state.daysUntilNextSeason}d until launch`
              : `${state.nextSeasonName} in ${state.daysUntilNextSeason}d`}
          </p>
        </div>
      </div>

      {/* Season theme */}
      <p className="text-xs text-neutral-500 mb-4 italic">
        {state.season.theme}
      </p>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-neutral-500 mb-1">
          <span>Season progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${state.season.color}, #DC97FF)`,
            }}
          />
        </div>
        {/* Week markers */}
        <div className="flex justify-between mt-1">
          {Array.from({ length: 13 }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i + 1 <= state.weekInSeason
                  ? "opacity-100"
                  : "opacity-20"
              }`}
              style={{
                backgroundColor:
                  i + 1 === state.weekInSeason
                    ? state.season.color
                    : i + 1 < state.weekInSeason
                    ? "#666"
                    : "#333",
              }}
              title={`Week ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Current Pattern Card */}
      <div className="bg-white/[0.03] rounded-lg p-3 mb-3 border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: state.season.color }}
          />
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            This Week&apos;s Pattern
          </span>
        </div>
        <p className="text-white font-semibold">
          {state.pattern.name}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          {state.pattern.description}
        </p>
      </div>

      {/* Current Challenge Lab */}
      {state.challenge && (
        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#DC97FF" }}
              />
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                G2L Challenge #{state.challengeNumber}
              </span>
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                state.challengeWeekType === "challenge"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-violet-500/10 text-violet-400"
              }`}
            >
              {state.challengeWeekType === "challenge"
                ? "🔥 Challenge Week"
                : "🔧 Open Week"}
            </span>
          </div>
          <p className="text-white font-semibold">{state.challenge.name}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {state.challenge.humanQuestion}
          </p>
        </div>
      )}
    </div>
  );
}
