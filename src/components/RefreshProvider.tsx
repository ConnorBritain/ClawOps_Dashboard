"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface RefreshContextValue {
  refreshKey: number;
  refresh: () => void;
  lastRefreshed: Date;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
}

const RefreshContext = createContext<RefreshContextValue>({
  refreshKey: 0,
  refresh: () => {},
  lastRefreshed: new Date(),
  autoRefresh: true,
  setAutoRefresh: () => {},
});

export function useRefresh() {
  return useContext(RefreshContext);
}

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setLastRefreshed(new Date());
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  return (
    <RefreshContext.Provider
      value={{ refreshKey, refresh, lastRefreshed, autoRefresh, setAutoRefresh }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function RefreshButton() {
  const { refresh, lastRefreshed, autoRefresh, setAutoRefresh } = useRefresh();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    refresh();
    setTimeout(() => setSpinning(false), 1000);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setAutoRefresh(!autoRefresh)}
        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
          autoRefresh
            ? "border-green-500/30 text-green-500/60"
            : "border-neutral-700 text-neutral-600"
        }`}
      >
        {autoRefresh ? "AUTO" : "MANUAL"}
      </button>
      <button
        onClick={handleRefresh}
        className="text-neutral-500 hover:text-neutral-300 transition-colors"
        title="Refresh all data"
      >
        <svg
          className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
      <span className="text-[10px] text-neutral-600">
        {lastRefreshed.toLocaleTimeString()}
      </span>
    </div>
  );
}
