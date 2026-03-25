"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import {
  buildAgentSnapshots,
  DASHBOARD_TABS,
  formatCurrency,
  formatDuration,
  getSpendStatusColor,
  getVentureClasses,
  getWorkStatusClasses,
  type BeaconResponse,
  type ContentItem,
  type ContentStatusResponse,
  type CronResponse,
  type DashboardTab,
  type PostizResponse,
  type SeasonResponse,
  type SpendResponse,
  type WorkItem,
  type WorkResponse,
} from "@/lib/dashboard";
import {
  formatCentralDate,
  formatCentralDateTime,
  formatTimeAgo,
  formatTimeUntil,
} from "@/lib/time";
import { RefreshButton, useRefresh } from "@/components/RefreshProvider";

interface DashboardData {
  season: SeasonResponse | null;
  spend: SpendResponse | null;
  cron: CronResponse | null;
  work: WorkResponse | null;
  beacon: BeaconResponse | null;
  content: ContentStatusResponse | null;
  postiz: PostizResponse | null;
}

const EMPTY_WORK: WorkResponse = {
  items: [],
  byAgent: {},
  byStatus: {},
  total: 0,
};

const tabMeta: Record<
  DashboardTab,
  { label: string; eyebrow: string; icon: (active: boolean) => ReactNode }
> = {
  dashboard: {
    label: "Dashboard",
    eyebrow: "Command overview",
    icon: (active) => <ChartIcon active={active} />,
  },
  season: {
    label: "Season",
    eyebrow: "Fiscal rhythm",
    icon: (active) => <SignalIcon active={active} />,
  },
  agents: {
    label: "Agents",
    eyebrow: "Fleet health",
    icon: (active) => <RobotIcon active={active} />,
  },
  content: {
    label: "Content",
    eyebrow: "Publishing flow",
    icon: (active) => <NotebookIcon active={active} />,
  },
  metrics: {
    label: "Metrics",
    eyebrow: "Business pulse",
    icon: (active) => <ChartIcon active={active} />,
  },
};

function normalizeTab(value: string | null): DashboardTab {
  return DASHBOARD_TABS.includes(value as DashboardTab)
    ? (value as DashboardTab)
    : "dashboard";
}

async function fetchResource<T>(url: string) {
  try {
    const response = await fetch(url);
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function DashboardShell() {
  const { refreshKey } = useRefresh();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    season: null,
    spend: null,
    cron: null,
    work: null,
    beacon: null,
    content: null,
    postiz: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const [
        season,
        spend,
        cron,
        work,
        beacon,
        content,
        postiz,
      ] = await Promise.all([
        fetchResource<SeasonResponse>("/api/season"),
        fetchResource<SpendResponse>("/api/spend"),
        fetchResource<CronResponse>("/api/cron"),
        fetchResource<WorkResponse>("/api/work"),
        fetchResource<BeaconResponse>("/api/beacon"),
        fetchResource<ContentStatusResponse>("/api/content-status"),
        fetchResource<PostizResponse>("/api/postiz"),
      ]);

      if (cancelled) {
        return;
      }

      setData({
        season,
        spend,
        cron,
        work,
        beacon,
        content,
        postiz,
      });
      setLoading(false);
    }

    setLoading(true);
    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleTabChange(nextTab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === "dashboard") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  const agentSnapshots = buildAgentSnapshots(data.spend, data.cron, data.work);
  const workData = data.work || EMPTY_WORK;

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
      <header className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,125,69,0.18),_transparent_40%),linear-gradient(180deg,rgba(20,20,20,0.98),rgba(12,12,12,0.96))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <Image
                src="/clawops-logo.png"
                alt="ClawOps"
                width={44}
                height={44}
                className="rounded-xl"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#FFB28F]">
                Pattern Engine Ops
              </p>
              <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                ClawOps Dashboard
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-400">
                Mobile-first command view for the Pattern Engine, G2L, and
                Pidgeon fleet.
              </p>
            </div>
          </div>
          <RefreshButton />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeaderMetric
            label="Weekly spend"
            value={data.spend ? formatCurrency(data.spend.totals.weekly) : "--"}
            tone="#FF7D45"
          />
          <HeaderMetric
            label="Open work"
            value={String(workData.total)}
            tone="#DC97FF"
          />
          <HeaderMetric
            label="Beacon thoughts"
            value={data.beacon ? data.beacon.totalThoughts.toLocaleString() : "--"}
            tone="#60A5FA"
          />
          <HeaderMetric
            label="Cron health"
            value={
              data.cron
                ? data.cron.summary.errors > 0
                  ? `${data.cron.summary.errors} issues`
                  : "Healthy"
                : "--"
            }
            tone={data.cron?.summary.errors ? "#F87171" : "#4ADE80"}
          />
        </div>

        {/* Quick Links */}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="https://patternengineai.slack.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#FF7D45]/30 hover:text-[#FF7D45]">
            💬 Slack
          </a>
          <a href="https://drive.google.com/drive/u/0/shared-drives" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#4ADE80]/30 hover:text-[#4ADE80]">
            📁 Drive
          </a>
          <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#60A5FA]/30 hover:text-[#60A5FA]">
            🔑 OpenRouter
          </a>
          <a href="https://platform.postiz.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#DC97FF]/30 hover:text-[#DC97FF]">
            📱 Postiz
          </a>
          <a href="https://www.skool.com/genai-growth-labs-6038" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#FBBF24]/30 hover:text-[#FBBF24]">
            🎓 Skool
          </a>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:border-[#4ADE80]/30 hover:text-[#4ADE80]">
            🧠 Beacon
          </a>
        </div>
      </header>

      <div className="lg:hidden">
        <TabHeading activeTab={activeTab} />
        {renderTab({
          tab: activeTab,
          loading,
          data,
          agentSnapshots,
          workData,
        })}
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-12">
        <div className="col-span-7">
          <SeasonSection loading={loading} data={data.season} />
        </div>
        <div className="col-span-5">
          <MetricsSection
            loading={loading}
            beacon={data.beacon}
            spend={data.spend}
            postiz={data.postiz}
            cron={data.cron}
            work={workData}
            compact
          />
        </div>
        <div className="col-span-7">
          <AgentsSection
            loading={loading}
            snapshots={agentSnapshots}
            cronSource={data.cron?.source || "unknown"}
          />
        </div>
        <div className="col-span-5">
          <ContentSection
            loading={loading}
            content={data.content}
            beacon={data.beacon}
          />
        </div>
      </div>

      <footer className="mt-8 hidden items-center justify-between border-t border-white/6 pt-4 text-xs text-neutral-600 lg:flex">
        <p>Pattern Engine LLC • ops.patternengine.ai</p>
        <p>Connor coffee-check ready at 375px</p>
      </footer>

      <MobileTabBar activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}

function renderTab({
  tab,
  loading,
  data,
  agentSnapshots,
  workData,
}: {
  tab: DashboardTab;
  loading: boolean;
  data: DashboardData;
  agentSnapshots: ReturnType<typeof buildAgentSnapshots>;
  workData: WorkResponse;
}) {
  if (tab === "season") {
    return <SeasonSection loading={loading} data={data.season} />;
  }

  if (tab === "dashboard") {
    return (
      <MetricsSection
        loading={loading}
        beacon={data.beacon}
        spend={data.spend}
        postiz={data.postiz}
        cron={data.cron}
        work={workData}
        compact={false}
      />
    );
  }

  if (tab === "agents") {
    return (
      <AgentsSection
        loading={loading}
        snapshots={agentSnapshots}
        cronSource={data.cron?.source || "unknown"}
      />
    );
  }

  if (tab === "content") {
    return (
      <ContentSection
        loading={loading}
        content={data.content}
        beacon={data.beacon}
      />
    );
  }

  return (
    <MetricsSection
      loading={loading}
      beacon={data.beacon}
      spend={data.spend}
      postiz={data.postiz}
      cron={data.cron}
      work={workData}
      compact={false}
    />
  );
}

function HeaderMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-semibold" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

function TabHeading({ activeTab }: { activeTab: DashboardTab }) {
  const meta = tabMeta[activeTab];

  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">
          {meta.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">{meta.label}</h2>
      </div>
      <div className="rounded-full border border-[#FF7D45]/20 bg-[#FF7D45]/8 px-3 py-1 text-[11px] text-[#FFB28F]">
        Mobile View
      </div>
    </div>
  );
}

function MobileTabBar({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#141414]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1">
        {DASHBOARD_TABS.map((tab) => {
          const active = tab === activeTab;
          const meta = tabMeta[tab];

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center rounded-2xl border transition-all ${
                active
                  ? "border-[#FF7D45]/20 bg-[#FF7D45]/10 text-[#FF7D45]"
                  : "border-transparent bg-transparent text-[#666666]"
              }`}
            >
              {meta.icon(active)}
              <span className={`mt-1 text-[10px] font-medium ${active ? "opacity-100" : "opacity-80"}`}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
            {subtitle}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function SeasonSection({
  loading,
  data,
}: {
  loading: boolean;
  data: SeasonResponse | null;
}) {
  if (loading) {
    return (
      <SectionCard title="Season" subtitle="Fiscal rhythm">
        <SkeletonRows rows={4} />
      </SectionCard>
    );
  }

  if (!data) {
    return (
      <SectionCard title="Season" subtitle="Fiscal rhythm">
        <ErrorState message="Season data is unavailable right now." />
      </SectionCard>
    );
  }

  const isPreLaunch = data.weekInSeason === 0;
  const seasonNames = ["Signal", "Systems", "Machines", "Stewardship"];

  if (isPreLaunch) {
    return (
      <SectionCard title="Season" subtitle="Pre-launch countdown">
        <div className="rounded-[24px] border border-[#FF7D45]/15 bg-[linear-gradient(180deg,rgba(255,125,69,0.12),rgba(255,125,69,0.03))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#FFB28F]">Season 1: Signal</p>
              <h4 className="mt-1 text-2xl font-semibold text-white">Launch sequence running</h4>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
                The fiscal year anchor begins on April 1, 2026. Until then the
                dashboard stays in countdown mode.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/25 px-4 py-3 text-center">
              <p className="text-4xl font-semibold text-[#FF7D45]">
                {data.daysUntilNextSeason}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                days
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SeasonHighlight
              label="First pattern card"
              title={data.pattern.name}
              copy={data.pattern.description}
              tone={data.season.color}
            />
            {data.challenge ? (
              <SeasonHighlight
                label="First challenge lab"
                title={data.challenge.name}
                copy={data.challenge.humanQuestion}
                tone="#DC97FF"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {seasonNames.map((name, index) => (
            <div
              key={name}
              className={`rounded-2xl border px-3 py-3 ${
                index === 0
                  ? "border-[#FF7D45]/20 bg-[#FF7D45]/8"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <p className="text-xs font-medium text-white">{name}</p>
              <p className="mt-1 text-[11px] text-neutral-500">
                {index === 0 ? "Next up" : "Later in cycle"}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  const progressPercent = Math.round(data.seasonProgress * 100);

  return (
    <SectionCard title="Season" subtitle="Fiscal rhythm">
      <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: data.season.color }}>
              Season {data.season.number}: {data.season.name}
            </p>
            <h4 className="mt-1 text-2xl font-semibold text-white">
              Week {data.weekInSeason} of 13
            </h4>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              {data.season.theme}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              Next season
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {data.nextSeasonName}
            </p>
            <p className="text-sm text-neutral-400">
              in {data.daysUntilNextSeason} days
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
            <span>
              {formatCentralDate(data.seasonStartDate)} - {formatCentralDate(data.seasonEndDate)}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${data.season.color}, #DC97FF)`,
              }}
            />
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 13 }, (_, index) => {
              const week = index + 1;
              const active = week === data.weekInSeason;
              const done = week < data.weekInSeason;

              return (
                <div
                  key={week}
                  className="h-2 flex-1 rounded-full"
                  style={{
                    backgroundColor: active
                      ? data.season.color
                      : done
                      ? "rgba(229,229,229,0.4)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SeasonHighlight
          label="Pattern card"
          title={data.pattern.name}
          copy={data.pattern.description}
          tone={data.season.color}
        />
        {data.challenge ? (
          <SeasonHighlight
            label={
              data.challengeWeekType === "challenge"
                ? `Challenge lab #${data.challengeNumber}`
                : `Open week #${data.challengeNumber}`
            }
            title={data.challenge.name}
            copy={data.challenge.humanQuestion}
            tone={data.challengeWeekType === "challenge" ? "#FBBF24" : "#DC97FF"}
          />
        ) : null}
      </div>
    </SectionCard>
  );
}

function SeasonHighlight({
  label,
  title,
  copy,
  tone,
}: {
  label: string;
  title: string;
  copy: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      </div>
      <p className="mt-3 text-base font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">{copy}</p>
    </div>
  );
}

function AgentsSection({
  loading,
  snapshots,
  cronSource,
}: {
  loading: boolean;
  snapshots: ReturnType<typeof buildAgentSnapshots>;
  cronSource: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <SectionCard title="Agents" subtitle="Fleet health">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{snapshots.length} agents on deck</span>
        <span className="rounded-full border border-white/8 px-2 py-1 uppercase tracking-[0.16em]">
          {cronSource}
        </span>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : snapshots.length === 0 ? (
        <ErrorState message="Agent data is unavailable right now." />
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot) => {
            const spendTone = getSpendStatusColor(snapshot.spend?.status);
            const active = expandedId === snapshot.id;

            return (
              <article
                key={snapshot.id}
                className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(active ? null : snapshot.id)}
                  className="w-full p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xl">
                        <span>{snapshot.emoji}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-medium text-white">
                            {snapshot.name}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${getVentureClasses(snapshot.venture)}`}
                          >
                            {snapshot.venture}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-400 sm:grid-cols-3">
                          <MetricPill label="Spend" value={snapshot.spend ? formatCurrency(snapshot.spend.weekly) : "--"} />
                          <MetricPill label="Last cron" value={formatTimeAgo(snapshot.lastRunAt)} />
                          <MetricPill label="Open work" value={String(snapshot.activeWorkCount)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                          Next cron
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {formatTimeUntil(snapshot.nextRunAt)}
                        </p>
                      </div>
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: snapshot.hasErrors ? "#F87171" : spendTone,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Budget</span>
                      <span>
                        {snapshot.spend?.limit
                          ? `${Math.min(snapshot.spend.usagePercent, 100)}%`
                          : "No cap"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(snapshot.spend?.usagePercent || 0, 100)}%`,
                          backgroundColor: spendTone,
                        }}
                      />
                    </div>
                  </div>
                </button>

                {active ? (
                  <div className="border-t border-white/8 bg-black/20 p-4">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          Spend breakdown
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <MetricPanel label="Today" value={snapshot.spend ? formatCurrency(snapshot.spend.daily) : "--"} />
                          <MetricPanel label="This week" value={snapshot.spend ? formatCurrency(snapshot.spend.weekly) : "--"} />
                          <MetricPanel label="This month" value={snapshot.spend ? formatCurrency(snapshot.spend.monthly) : "--"} />
                          <MetricPanel
                            label="Remaining"
                            value={
                              snapshot.spend?.limitRemaining != null
                                ? formatCurrency(snapshot.spend.limitRemaining)
                                : "--"
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          Cron activity
                        </p>
                        <div className="mt-3 space-y-2">
                          {snapshot.jobs.length > 0 ? (
                            snapshot.jobs.map((job) => (
                              <div
                                key={job.id}
                                className="rounded-2xl border border-white/8 bg-black/20 p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-white">{job.name}</p>
                                    <p className="mt-1 text-[11px] text-neutral-500">
                                      {job.schedule}
                                    </p>
                                  </div>
                                  <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        job.consecutiveErrors > 0
                                          ? "#F87171"
                                          : job.lastStatus === "ok"
                                          ? "#4ADE80"
                                          : "#666666",
                                    }}
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-400">
                                  <span>Last {formatTimeAgo(job.lastRunAt)}</span>
                                  <span>Next {formatTimeUntil(job.nextRunAt)}</span>
                                  <span>Duration {formatDuration(job.lastDurationMs)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-neutral-500">No cron jobs reported.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          Active work
                        </p>
                        <span className="text-sm text-neutral-400">
                          {snapshot.activeWorkCount} item{snapshot.activeWorkCount === 1 ? "" : "s"}
                        </span>
                      </div>

                      {snapshot.workItems.length > 0 ? (
                        <div className="space-y-2">
                          {snapshot.workItems.map((item) => (
                            <WorkItemRow key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">Nothing queued for this agent.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm text-neutral-200">{value}</p>
    </div>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function ContentSection({
  loading,
  content,
  beacon,
}: {
  loading: boolean;
  content: ContentStatusResponse | null;
  beacon: BeaconResponse | null;
}) {
  const items = content?.items || [];
  const recent = beacon?.recent || [];

  return (
    <SectionCard title="Content" subtitle="Publishing flow">
      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item) => <ContentPipelineCard key={item.type} item={item} />)
            ) : (
              <ErrorState message="Content pipeline data is unavailable right now." />
            )}
          </div>

          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  Beacon feed
                </p>
                <p className="mt-1 text-base font-medium text-white">Recent activity</p>
              </div>
              {beacon ? (
                <span className="text-xs text-neutral-500">
                  {beacon.thisWeekThoughts} this week
                </span>
              ) : null}
            </div>

            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-white/8 bg-black/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-neutral-200">
                          {activity.text}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                          {activity.type || "thought"}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-neutral-500">
                        <p>{activity.source}</p>
                        <p className="mt-1">{formatTimeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No recent Beacon activity yet.</p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function ContentPipelineCard({ item }: { item: ContentItem }) {
  const statusStyles: Record<
    ContentItem["status"],
    { label: string; color: string; classes: string }
  > = {
    "not-started": {
      label: "Not started",
      color: "#666666",
      classes: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
    },
    drafted: {
      label: "Drafted",
      color: "#FBBF24",
      classes: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    reviewed: {
      label: "Reviewed",
      color: "#60A5FA",
      classes: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    },
    published: {
      label: "Published",
      color: "#4ADE80",
      classes: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    },
  };
  const pipelineSteps: ContentItem["status"][] = [
    "not-started",
    "drafted",
    "reviewed",
    "published",
  ];
  const currentStep = pipelineSteps.indexOf(item.status);
  const status = statusStyles[item.status];

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-medium text-white">{item.label}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {item.lastUpdate
              ? `Updated ${formatCentralDateTime(item.lastUpdate)}`
              : "No activity captured this week"}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${status.classes}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {pipelineSteps.map((step, index) => (
          <div
            key={step}
            className="h-2 rounded-full"
            style={{
              backgroundColor:
                index <= currentStep ? status.color : "rgba(255,255,255,0.07)",
            }}
          />
        ))}
      </div>

      {item.source ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          Source: {item.source}
        </p>
      ) : null}
    </div>
  );
}

function MetricsSection({
  loading,
  beacon,
  spend,
  postiz,
  cron,
  work,
  compact,
}: {
  loading: boolean;
  beacon: BeaconResponse | null;
  spend: SpendResponse | null;
  postiz: PostizResponse | null;
  cron: CronResponse | null;
  work: WorkResponse;
  compact: boolean;
}) {
  const metricCards = [
    {
      label: "OpenRouter",
      value: spend ? formatCurrency(spend.totals.weekly) : "--",
      detail: spend
        ? `${formatCurrency(spend.totals.daily)} today • ${formatCurrency(spend.totals.monthly)} month`
        : "Spend feed unavailable",
      tone: "#FF7D45",
    },
    {
      label: "Beacon",
      value: beacon ? beacon.totalThoughts.toLocaleString() : "--",
      detail: beacon ? `${beacon.thisWeekThoughts} thoughts this week` : "Beacon feed unavailable",
      tone: "#DC97FF",
    },
    {
      label: "Postiz",
      value: postiz?.counts ? String(postiz.counts.thisWeek) : "--",
      detail: postiz?.counts
        ? `${postiz.counts.scheduled} scheduled • ${postiz.counts.published} published`
        : "Postiz feed unavailable",
      tone: "#60A5FA",
    },
    {
      label: "Cron",
      value: cron ? String(cron.summary.enabled) : "--",
      detail: cron
        ? cron.summary.errors > 0
          ? `${cron.summary.errors} jobs with errors`
          : "All jobs healthy"
        : "Cron feed unavailable",
      tone: cron?.summary.errors ? "#F87171" : "#4ADE80",
    },
  ];

  return (
    <SectionCard title="Metrics" subtitle="Business pulse">
      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <>
          <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: card.tone }}>
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <WorkQueuePanel work={work} />
          </div>
        </>
      )}
    </SectionCard>
  );
}

function WorkQueuePanel({ work }: { work: WorkResponse }) {
  const agentOrder = AGENTS.filter((agent) => agent.id !== "default").map((agent) => agent.id);
  const groupedEntries = Object.entries(work.byAgent).sort(([leftId], [rightId]) => {
    const leftIndex = agentOrder.indexOf(leftId);
    const rightIndex = agentOrder.indexOf(rightId);

    if (leftIndex === -1 && rightIndex === -1) {
      return leftId.localeCompare(rightId);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Work queue
          </p>
          <p className="mt-1 text-base font-medium text-white">
            Active items grouped by agent
          </p>
        </div>
        <span className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-neutral-400">
          {work.total} open
        </span>
      </div>

      {groupedEntries.length > 0 ? (
        <div className="space-y-3">
          {groupedEntries.map(([agentId, items]) => {
            const agentName = AGENTS.find((agent) => agent.id === agentId)?.name || agentId;

            return (
              <div
                key={agentId}
                className="rounded-2xl border border-white/8 bg-black/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{agentName}</p>
                  <span className="text-xs text-neutral-500">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <WorkItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No active work items in Beacon right now.</p>
      )}
    </div>
  );
}

function WorkItemRow({ item }: { item: WorkItem }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium text-white">{item.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getWorkStatusClasses(item.status)}`}>
          {item.status.replace("_", " ")}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getVentureClasses(item.venture)}`}>
          {item.venture}
        </span>
      </div>
      {item.description ? (
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.description}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
        <span>Priority {item.priority}</span>
        <span>Updated {formatCentralDateTime(item.updatedAt)}</span>
      </div>
    </div>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-200">
      {message}
    </div>
  );
}

function SignalIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-transform ${active ? "scale-105" : "scale-100"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 19a7 7 0 0 1 14 0" />
      <path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RobotIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-transform ${active ? "scale-105" : "scale-100"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="7" width="12" height="10" rx="3" />
      <path d="M12 3v4" />
      <path d="M9 17v2" />
      <path d="M15 17v2" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function NotebookIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-transform ${active ? "scale-105" : "scale-100"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
      <path d="M4 6h1" />
      <path d="M4 10h1" />
      <path d="M4 14h1" />
      <path d="M4 18h1" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-transform ${active ? "scale-105" : "scale-100"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-4" />
    </svg>
  );
}
