import SeasonTracker from "@/components/SeasonTracker";
import OpenRouterSpend from "@/components/OpenRouterSpend";
import ContentStatus from "@/components/ContentStatus";
import AgentHealth from "@/components/AgentHealth";
import BusinessMetrics from "@/components/BusinessMetrics";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🦅</span>
              ClawOps Dashboard
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Pattern Engine · Generative Growth Labs · Pidgeon Health
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-xs text-neutral-500">Live</span>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Left: Season Tracker */}
        <SeasonTracker />

        {/* Top Right: Content Status */}
        <ContentStatus />

        {/* Bottom Left: Agent Health */}
        <AgentHealth />

        {/* Bottom Right: Business Metrics */}
        <BusinessMetrics />
      </div>

      {/* Full Width: OpenRouter Spend */}
      <div className="mt-4">
        <OpenRouterSpend />
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-neutral-600">
        <p>
          Pattern Engine LLC ·{" "}
          <span style={{ color: "#FF7D45" }}>ops.patternengine.ai</span>
        </p>
      </footer>
    </main>
  );
}
