export const dynamic = 'force-dynamic';

import Image from "next/image";
import DashboardShellV2 from "@/components/DashboardShellV2";
import SeasonTracker from "@/components/SeasonTracker";
import OpenRouterSpend from "@/components/OpenRouterSpend";
import ContentStatus from "@/components/ContentStatus";
import AgentHealth from "@/components/AgentHealth";
import BusinessMetrics from "@/components/BusinessMetrics";
import RecentActivity from "@/components/RecentActivity";
import { RefreshProvider, RefreshButton } from "@/components/RefreshProvider";

export default function Home() {
  return (
    <RefreshProvider>
      <DashboardShellV2 />
      {false && (
      <main className="min-h-screen p-4 md:p-6 lg:p-8 max-w-[1440px] mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/clawops-logo.png"
                alt="ClawOps"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-white">
                  ClawOps Dashboard
                </h1>
                <p className="text-xs text-neutral-500">
                  Pattern Engine · G2L · Pidgeon Health
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
                <span className="text-xs text-neutral-500">Connected</span>
              </div>
              <RefreshButton />
            </div>
          </div>
        </header>

        {/* Row 1: Season + Business Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <SeasonTracker />
          </div>
          <div>
            <BusinessMetrics />
          </div>
        </div>

        {/* Row 2: Content Pipeline + Agent Fleet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ContentStatus />
          <AgentHealth />
        </div>

        {/* Row 3: Full Width Spend */}
        <OpenRouterSpend />

        {/* Row 4: Recent Activity */}
        <div className="mt-4">
          <RecentActivity />
        </div>

        {/* Footer */}
        <footer className="mt-8 pb-4 text-center text-xs text-neutral-700">
          <p>
            Pattern Engine LLC ·{" "}
            <span style={{ color: "#FF7D45" }}>ops.patternengine.ai</span>
            {" · "}
            <span className="text-neutral-600">v0.1.0</span>
          </p>
        </footer>
      </main>
      )}
    </RefreshProvider>
  );
}
