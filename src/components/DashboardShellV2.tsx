"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import {
  buildAgentSnapshots,
  DASHBOARD_TABS,
  type ContentPipelineResponse,
  formatCurrency,
  formatDuration,
  formatPercent,
  getVentureClasses,
  getWorkStatusClasses,
  type AgentSnapshot,
  type BeaconResponse,
  type CronJobSummary,
  type CronResponse,
  type DashboardTab,
  type PostizResponse,
  type SeasonMatrixResponse,
  type SeasonMatrixSlot,
  type SeasonResponse,
  type SpendResponse,
  type WorkItem,
  type WorkResponse,
} from "@/lib/dashboard";
import { SEASONS, SEASON_PATTERNS } from "@/lib/seasons";
import {
  formatAge,
  getCentralDateParts,
  getCentralWeekStart,
  formatCentralDateTime,
  formatTimeAgo,
  formatTimeUntil,
} from "@/lib/time";
import { ContentPipelineSection } from "@/components/ContentPipelineSection";
import { RefreshButton, useRefresh } from "@/components/RefreshProvider";

interface DashboardData {
  season: SeasonResponse | null;
  seasonMatrix: SeasonMatrixResponse | null;
  spend: SpendResponse | null;
  cron: CronResponse | null;
  work: WorkResponse | null;
  beacon: BeaconResponse | null;
  contentPipeline: ContentPipelineResponse | null;
  postiz: PostizResponse | null;
}

const EMPTY_WORK: WorkResponse = { items: [], byAgent: {}, byStatus: {}, total: 0 };

const tabMeta: Record<DashboardTab, { label: string; navLabel: string; eyebrow: string; icon: ReactNode }> = {
  dashboard: { label: "Dashboard", navLabel: "Home", eyebrow: "Command overview", icon: <OverviewIcon /> },
  season: { label: "Season", navLabel: "Season", eyebrow: "Fiscal rhythm", icon: <SignalIcon /> },
  agents: { label: "Agents", navLabel: "Agents", eyebrow: "Fleet health", icon: <RobotIcon /> },
  content: { label: "Content", navLabel: "Content", eyebrow: "Publishing flow", icon: <NotebookIcon /> },
  metrics: { label: "Metrics", navLabel: "Metrics", eyebrow: "Business pulse", icon: <ChartIcon /> },
};

const quickLinks = [
  ["Slack", "https://patternengineai.slack.com"],
  ["Drive", "https://drive.google.com/drive/u/0/shared-drives"],
  ["OpenRouter", "https://openrouter.ai/settings/keys"],
  ["Postiz", "https://platform.postiz.com"],
  ["Skool", "https://www.skool.com/genai-growth-labs-6038"],
  ["Beacon", "https://supabase.com/dashboard"],
] as const;

function normalizeTab(value: string | null): DashboardTab {
  return DASHBOARD_TABS.includes(value as DashboardTab) ? (value as DashboardTab) : "dashboard";
}

async function fetchResource<T>(url: string) {
  try {
    const response = await fetch(url);
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function spendMeta(snapshot: AgentSnapshot) {
  const spend = snapshot.spend;
  if (!spend) return { label: "--", detail: "Spend unavailable", percent: 0, tone: "#555" };
  const percent = Math.min(spend.usagePercent || 0, 100);
  const tone = percent >= 90 ? "#F87171" : percent >= 80 ? "#FBBF24" : "#4ADE80";
  return {
    label: spend.limit ? `${formatCurrency(spend.weekly)} / ${formatCurrency(spend.limit)}` : formatCurrency(spend.weekly),
    detail: spend.limit ? `${formatPercent(percent)} of cap` : "No cap set",
    percent,
    tone,
  };
}

function cronState(job: CronJobSummary) {
  if (job.consecutiveErrors > 0 || job.lastStatus === "error") return ["#F87171", "Error"] as const;
  if (!job.lastRunAt) {
    if (job.nextRunAt) {
      const diff = new Date(job.nextRunAt).getTime() - Date.now();
      if (diff >= 0 && diff <= 3600000) return ["#60A5FA", "Due soon"] as const;
    }
    return ["#555555", "No data"] as const;
  }
  if (job.nextRunAt && new Date(job.nextRunAt).getTime() < Date.now() - 900000) return ["#FBBF24", "Overdue"] as const;
  return ["#4ADE80", "Healthy"] as const;
}

function getNextCron(cron: CronResponse | null) {
  return [...(cron?.jobs || [])]
    .filter((job) => job.nextRunAt)
    .sort((left, right) => new Date(left.nextRunAt as string).getTime() - new Date(right.nextRunAt as string).getTime())[0];
}

function currentWeekProgress() {
  const parts = getCentralDateParts(new Date());
  const dayOrder: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const dayIndex = dayOrder[parts.weekday] ?? 0;
  const fraction = (dayIndex + parts.hour / 24 + parts.minute / 1440) / 7;
  return Math.max(0.16, Math.min(fraction, 1));
}

function buildAttentionSignal(data: DashboardData, work: WorkResponse) {
  const highPriority = work.items.filter((item) => ["high", "urgent"].includes(item.priority)).length;
  const cronErrors = data.cron?.summary.errors || 0;

  if (cronErrors > 0) {
    return { label: `${cronErrors} cron issue${cronErrors === 1 ? "" : "s"}`, detail: "Reliability needs attention", tone: "#F87171" };
  }

  if (!data.postiz?.summary?.nextScheduled) {
    return { label: "No post queued", detail: "Publishing runway is empty", tone: "#FBBF24" };
  }

  if (highPriority > 0) {
    return { label: `${highPriority} high-priority`, detail: "Open item needs a decision", tone: "#FBBF24" };
  }

  return { label: "Clear deck", detail: "No immediate operational risk", tone: "#4ADE80" };
}

function buildSystemHealth(data: DashboardData) {
  const cronErrors = data.cron?.summary.errors || 0;
  if (cronErrors > 0) {
    return { label: "Cron warning", detail: `${cronErrors} cron issue${cronErrors === 1 ? "" : "s"} reported` };
  }

  if (data.cron?.source === "supabase") {
    return { label: "Stable", detail: "Live cron snapshot flowing" };
  }

  if (data.cron?.source) {
    return { label: "Fallback", detail: `${data.cron.source} telemetry in use` };
  }

  return { label: "Unknown", detail: "Telemetry source unavailable" };
}

export default function DashboardShellV2() {
  const { refreshKey } = useRefresh();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const [mobileTab, setMobileTab] = useState<DashboardTab>(activeTab);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    season: null,
    seasonMatrix: null,
    spend: null,
    cron: null,
    work: null,
    beacon: null,
    contentPipeline: null,
    postiz: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [season, seasonMatrix, spend, cron, work, beacon, contentPipeline, postiz] = await Promise.all([
        fetchResource<SeasonResponse>("/api/season"),
        fetchResource<SeasonMatrixResponse>("/api/season-matrix"),
        fetchResource<SpendResponse>("/api/spend"),
        fetchResource<CronResponse>("/api/cron"),
        fetchResource<WorkResponse>("/api/work"),
        fetchResource<BeaconResponse>("/api/beacon"),
        fetchResource<ContentPipelineResponse>("/api/content-pipeline"),
        fetchResource<PostizResponse>("/api/postiz"),
      ]);
      if (cancelled) return;
      setData({ season, seasonMatrix, spend, cron, work, beacon, contentPipeline, postiz });
      setLoading(false);
    }
    setLoading(true);
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    setMobileTab(activeTab);
  }, [activeTab]);

  function handleTabChange(nextTab: DashboardTab) {
    setMobileTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "dashboard") params.delete("tab");
    else params.set("tab", nextTab);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  }

  const agentSnapshots = buildAgentSnapshots(data.spend, data.cron, data.work);
  const workData = data.work || EMPTY_WORK;

  return (
    <>
      <main className="mx-auto hidden min-h-screen max-w-[1440px] px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:block lg:px-8">
      <div className="hidden lg:block">
        <DesktopOverviewHeader data={data} work={workData} />
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-12">
        <div className="col-span-7"><SeasonSection loading={loading} season={data.season} seasonMatrix={data.seasonMatrix} /></div>
        <div className="col-span-5"><MetricsSection loading={loading} spend={data.spend} beacon={data.beacon} cron={data.cron} postiz={data.postiz} work={workData} content={data.contentPipeline} season={data.season} seasonMatrix={data.seasonMatrix} compact /></div>
        <div className="col-span-7"><AgentsSection loading={loading} snapshots={agentSnapshots} cronSource={data.cron?.source || "unknown"} /></div>
        <div className="col-span-5"><ContentSection loading={loading} content={data.contentPipeline} beacon={data.beacon} postiz={data.postiz} /></div>
      </div>

      <footer className="mt-8 hidden items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-neutral-600 lg:flex">
        <p>Pattern Engine LLC - ops.patternengine.ai</p>
        <p>Connor coffee-check ready at 375px</p>
      </footer>
      </main>

      <main className="lg:hidden">
        <div className="h-[100dvh] overflow-hidden px-4 pt-4">
          <div className="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+104px)]">
            {mobileTab === "dashboard" ? (
              <div className="dashboard-fade pb-5">
                <MobileOverviewSection loading={loading} data={data} work={workData} />
              </div>
            ) : (
              <div className="dashboard-fade pb-5">
                <TabHeading activeTab={mobileTab} />
                {renderTab(mobileTab, loading, data, agentSnapshots, workData)}
              </div>
            )}
          </div>
          <MobileTabBar activeTab={mobileTab} onChange={handleTabChange} />
        </div>
      </main>
    </>
  );
}

function renderTab(tab: DashboardTab, loading: boolean, data: DashboardData, agents: AgentSnapshot[], work: WorkResponse) {
  if (tab === "dashboard") return <MobileOverviewSection loading={loading} data={data} work={work} />;
  if (tab === "season") return <SeasonSection loading={loading} season={data.season} seasonMatrix={data.seasonMatrix} />;
  if (tab === "agents") return <AgentsSection loading={loading} snapshots={agents} cronSource={data.cron?.source || "unknown"} />;
  if (tab === "content") return <ContentSection loading={loading} content={data.contentPipeline} beacon={data.beacon} postiz={data.postiz} showHeader={false} />;
  return <MetricsSection loading={loading} spend={data.spend} beacon={data.beacon} cron={data.cron} postiz={data.postiz} work={work} content={data.contentPipeline} season={data.season} seasonMatrix={data.seasonMatrix} compact={false} />;
}

function DesktopOverviewHeader({ data, work }: { data: DashboardData; work: WorkResponse }) {
  const nextCron = getNextCron(data.cron);
  const attention = buildAttentionSignal(data, work);
  const nextPost = data.postiz?.summary?.nextScheduled;
  const systemHealth = buildSystemHealth(data);
  return (
    <header className="card surface-strong relative mb-5 overflow-hidden p-5">
      <div className="absolute right-5 top-5">
        <RefreshButton />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <Image src="/clawops-logo.png" alt="ClawOps" width={56} height={56} className="rounded-2xl" />
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[#FFB28F]">Pattern Engine Ops</p>
        <h1 className="mt-2 text-4xl font-semibold leading-[0.92] text-white">ClawOps Dashboard</h1>
        <p className="mt-3 max-w-2xl text-base text-neutral-400">
          Command brief for the fleet, shaped for a fast 6:31am phone check.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HeroSignalCard label="Weekly spend" value={data.spend ? formatCurrency(data.spend.totals.weekly) : "--"} detail={data.spend ? `${formatCurrency(data.spend.totals.daily)} today` : "Spend unavailable"} tone="#FF7D45" />
        <HeroSignalCard label="Open work" value={String(work.total)} detail={`${work.items.filter((item) => ["high", "urgent"].includes(item.priority)).length} high-priority`} tone="#DC97FF" />
        <HeroSignalCard label="Next cron" value={nextCron ? nextCron.name : "No schedule"} detail={nextCron?.nextRunAt ? formatTimeUntil(nextCron.nextRunAt) : "No upcoming run"} tone="#60A5FA" />
        <HeroSignalCard label="Attention" value={attention.label} detail={attention.detail} tone={attention.tone} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <OverviewMiniCard
          label="Next publish"
          value={nextPost?.channel || "Nothing queued"}
          detail={nextPost?.scheduledDate ? formatCentralDateTime(nextPost.scheduledDate) : "Postiz queue is quiet"}
        />
        <OverviewMiniCard
          label="System health"
          value={systemHealth.label}
          detail={systemHealth.detail}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quickLinks.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] text-neutral-400 transition-all hover:border-white/[0.12] hover:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7D45]" />
            {label}
          </a>
        ))}
      </div>
    </header>
  );
}

function MobileOverviewSection({ loading, data, work }: { loading: boolean; data: DashboardData; work: WorkResponse }) {
  const nextCron = getNextCron(data.cron);
  const attention = buildAttentionSignal(data, work);
  const nextPost = data.postiz?.summary?.nextScheduled;
  const systemHealth = buildSystemHealth(data);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="card surface-strong p-4">
          <SkeletonRows rows={4} />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card surface-strong relative overflow-hidden p-4">
        <div className="absolute right-4 top-4">
          <RefreshButton compact />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="rounded-[20px] border border-white/10 bg-black/25 p-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.26)]">
            <Image src="/clawops-logo.png" alt="ClawOps" width={40} height={40} className="rounded-xl" />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[#FFB28F]">Pattern Engine Ops</p>
          <h1 className="mt-2 text-[2.15rem] font-semibold leading-[0.94] text-white">ClawOps Dashboard</h1>
          <p className="mt-3 max-w-[19rem] text-sm leading-relaxed text-neutral-400">
            Command brief for the fleet, shaped for a fast 6:31am phone check.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <HeroSignalCard label="Weekly spend" value={data.spend ? formatCurrency(data.spend.totals.weekly) : "--"} detail={data.spend ? `${formatCurrency(data.spend.totals.daily)} today` : "Spend unavailable"} tone="#FF7D45" />
          <HeroSignalCard label="Open work" value={String(work.total)} detail={`${work.items.filter((item) => ["high", "urgent"].includes(item.priority)).length} high-priority`} tone="#DC97FF" />
          <HeroSignalCard label="Next cron" value={nextCron ? nextCron.name : "No schedule"} detail={nextCron?.nextRunAt ? formatTimeUntil(nextCron.nextRunAt) : "No upcoming run"} tone="#60A5FA" />
          <HeroSignalCard label="Attention" value={attention.label} detail={attention.detail} tone={attention.tone} />
        </div>

        <div className="mt-3 grid gap-3">
          <OverviewMiniCard
            label="Next publish"
            value={nextPost?.channel || "Nothing queued"}
            detail={nextPost?.scheduledDate ? formatCentralDateTime(nextPost.scheduledDate) : "Postiz queue is quiet"}
          />
          <OverviewMiniCard
            label="System health"
            value={systemHealth.label}
            detail={systemHealth.detail}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {quickLinks.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] text-neutral-300 transition-all hover:border-white/[0.12] hover:text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7D45]" />
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function OverviewMiniCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="surface-soft rounded-[20px] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p>
    </div>
  );
}

function HeroSignalCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="surface-soft rounded-[22px] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-3 text-[1.95rem] font-semibold leading-[0.92]" style={{ color: tone }}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">{detail}</p>
    </div>
  );
}

function TabHeading({ activeTab }: { activeTab: DashboardTab }) {
  return <div className="mb-4 px-1"><p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">{tabMeta[activeTab].eyebrow}</p><h2 className="mt-1 text-[2rem] font-semibold leading-none text-white">{tabMeta[activeTab].label}</h2></div>;
}

function MobileTabBar({ activeTab, onChange }: { activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#111111]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-1">
        {DASHBOARD_TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => onChange(tab)} className={cx("flex min-h-[58px] flex-1 flex-col items-center justify-center rounded-[18px] px-1 text-[10px] transition-all", tab === activeTab ? "border border-[#FF7D45]/20 bg-[#FF7D45]/10 text-[#FFB28F]" : "text-neutral-500")}>
            {tabMeta[tab].icon}
            <span className="mt-1">{tabMeta[tab].navLabel}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="card p-4 sm:p-5"><div className="mb-4"><p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{subtitle}</p><h3 className="mt-1 text-lg font-semibold text-white">{title}</h3></div>{children}</section>;
}

const MATRIX_VENTURES: SeasonMatrixSlot["venture"][] = ["PE", "G2L", "Pidgeon", "Personal"];

const CONTENT_TYPE_META: Record<SeasonMatrixSlot["contentType"], { label: string; compact: string }> = {
  pattern_card: { label: "Pattern Card", compact: "Pattern" },
  build_note: { label: "Build Note", compact: "Build" },
  marginalia: { label: "Marginalia", compact: "Marginalia" },
  currents: { label: "Currents", compact: "Currents" },
  challenge_lab: { label: "Challenge Lab", compact: "Challenge" },
  social_post: { label: "Social Posts", compact: "Social" },
  newsletter: { label: "Newsletter", compact: "Newsletter" },
  heygen_video: { label: "HeyGen Video", compact: "Video" },
  skool_post: { label: "Skool Post", compact: "Skool" },
};

function matrixStatusMeta(status: SeasonMatrixSlot["status"]) {
  switch (status) {
    case "published":
      return { label: "Published", dot: "#4ADE80", classes: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" };
    case "scheduled":
      return { label: "Scheduled", dot: "#60A5FA", classes: "border-sky-500/20 bg-sky-500/10 text-sky-300" };
    case "approved":
      return { label: "Approved", dot: "#60A5FA", classes: "border-sky-500/20 bg-sky-500/10 text-sky-300" };
    case "review":
      return { label: "Review", dot: "#DC97FF", classes: "border-violet-500/20 bg-violet-500/10 text-violet-300" };
    case "drafted":
      return { label: "Drafted", dot: "#FBBF24", classes: "border-amber-500/20 bg-amber-500/10 text-amber-300" };
    case "idea":
      return { label: "Idea", dot: "#777777", classes: "border-neutral-500/20 bg-neutral-500/10 text-neutral-300" };
    default:
      return { label: "Not started", dot: "#555555", classes: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400" };
  }
}

function weekSummaryLabel(selectedSeason: number, week: number) {
  return SEASON_PATTERNS[selectedSeason]?.[week - 1]?.name || `Week ${week}`;
}

function SeasonSection({ loading, season, seasonMatrix }: { loading: boolean; season: SeasonResponse | null; seasonMatrix: SeasonMatrixResponse | null }) {
  const currentSeasonNumber = season?.season.number || 1;
  const currentWeek = season?.weekInSeason && season.weekInSeason > 0 ? season.weekInSeason : 1;
  const [selectedSeason, setSelectedSeason] = useState(currentSeasonNumber);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  useEffect(() => {
    setSelectedSeason(currentSeasonNumber);
  }, [currentSeasonNumber]);

  useEffect(() => {
    setSelectedWeek(currentWeek);
  }, [currentWeek]);

  if (loading) return <SectionCard title="Season" subtitle="Fiscal rhythm"><SkeletonRows rows={4} /></SectionCard>;
  if (!season) return <SectionCard title="Season" subtitle="Fiscal rhythm"><ErrorState message="Season data is unavailable right now." /></SectionCard>;

  const preLaunch = season.weekInSeason === 0;
  const slots = seasonMatrix?.slots || [];
  const seasonSlots = slots.filter((slot) => slot.season === selectedSeason);
  const seasonPatterns = SEASON_PATTERNS[selectedSeason] || [];
  const activeWeek = Math.min(Math.max(selectedWeek, 1), 13);
  const weekSlots = seasonSlots
    .filter((slot) => slot.week === activeWeek)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const startedCount = seasonSlots.filter((slot) => slot.status !== "not_started").length;
  const publishedCount = seasonSlots.filter((slot) => slot.status === "published").length;
  const filledWeeks = new Set(seasonSlots.filter((slot) => slot.status !== "not_started").map((slot) => slot.week)).size;

  const weekCards = Array.from({ length: 13 }, (_, index) => {
    const week = index + 1;
    const weekItems = seasonSlots.filter((slot) => slot.week === week);
    const done = weekItems.filter((slot) => slot.status === "published").length;
    const live = weekItems.filter((slot) => slot.status !== "not_started").length;
    return {
      week,
      title: seasonPatterns[index]?.name || `Week ${week}`,
      summary: weekItems.length ? `${live}/${weekItems.length} active` : "Template only",
      done,
    };
  });

  return (
    <SectionCard title="Season" subtitle={preLaunch ? "Pre-launch countdown" : "Fiscal rhythm"}>
      <div className="surface-strong rounded-[26px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[#FFB28F]">Season {preLaunch ? "1: Signal" : `${season.season.number}: ${season.season.name}`}</p>
            <h4 className="mt-1 text-[2rem] font-semibold leading-[0.96] text-white sm:text-[2.35rem]">
              {preLaunch ? "Launch sequence running" : `Week ${season.weekInSeason} of 13`}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {preLaunch ? "The fiscal year anchor begins on April 1, 2026. Until then the dashboard stays in countdown mode." : season.season.theme}
            </p>
            <p className="mt-3 text-sm text-neutral-500">Pattern machines are here. Wisdom is optional.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-3 text-center sm:min-w-[134px] sm:px-5 sm:py-4">
            <p className="text-5xl font-semibold tracking-[-0.04em] text-[#FF7D45] sm:text-7xl">{season.daysUntilNextSeason}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-neutral-500">{preLaunch ? "days" : "to next"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <HighlightCard label="Pattern card" title={season.pattern.name} copy={season.pattern.description} tone={season.season.color} />
          {season.challenge ? <HighlightCard label={preLaunch ? "First challenge lab" : `Challenge #${season.challengeNumber}`} title={season.challenge.name} copy={season.challenge.humanQuestion} tone="#DC97FF" /> : null}
        </div>
      </div>

      <div className="mt-4 space-y-4 border-t border-white/[0.05] pt-4">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((entry) => (
            <button
              key={entry.number}
              type="button"
              onClick={() => {
                setSelectedSeason(entry.number);
                setSelectedWeek(entry.number === currentSeasonNumber ? currentWeek : 1);
              }}
              className={cx(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                selectedSeason === entry.number
                  ? "border-[#FF7D45]/20 bg-[#FF7D45]/10 text-[#FFB28F]"
                  : "border-white/[0.08] bg-black/20 text-neutral-400"
              )}
            >
              {entry.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <OverviewMiniCard label="Planned slots" value={String(seasonSlots.length || 0)} detail={`Season ${selectedSeason} blueprint`} />
          <OverviewMiniCard label="In motion" value={String(startedCount)} detail={`${filledWeeks} week${filledWeeks === 1 ? "" : "s"} touched`} />
          <OverviewMiniCard label="Published" value={String(publishedCount)} detail="Green cells complete" />
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {weekCards.map((weekCard) => (
              <button
                key={weekCard.week}
                type="button"
                onClick={() => setSelectedWeek(weekCard.week)}
                className={cx(
                  "surface-soft w-[108px] rounded-[20px] px-3 py-3 text-left transition-colors",
                  activeWeek === weekCard.week && "border-[#FF7D45]/16 bg-[#FF7D45]/[0.05]"
                )}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">W{weekCard.week}</p>
                <p className="mt-2 text-sm font-medium text-white">{weekCard.title}</p>
                <p className="mt-1 text-[11px] text-neutral-500">{weekCard.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Week {activeWeek}</p>
              <p className="mt-1 text-lg font-semibold text-white">{weekSummaryLabel(selectedSeason, activeWeek)}</p>
            </div>
            <p className="text-sm text-neutral-500">
              {weekSlots.length ? `${weekSlots.length} planned slots` : "Blueprint not seeded for this week yet"}
            </p>
          </div>

          {weekSlots.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {MATRIX_VENTURES.map((venture) => {
                const ventureSlots = weekSlots.filter((slot) => slot.venture === venture);
                if (!ventureSlots.length) return null;

                return (
                  <div key={venture} className="rounded-[20px] border border-white/[0.06] bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{venture}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getVentureClasses(venture)}`}>{venture}</span>
                    </div>
                    <div className="space-y-2">
                      {ventureSlots.map((slot) => {
                        const status = matrixStatusMeta(slot.status);
                        const href = slot.canonicalUrl || slot.driveLink;
                        return (
                          <a
                            key={slot.slotId}
                            href={href || undefined}
                            target={href ? "_blank" : undefined}
                            rel={href ? "noreferrer" : undefined}
                            className={cx(
                              "block rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-3 transition-colors",
                              href && "hover:border-white/[0.12] hover:bg-white/[0.03]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.dot }} />
                                  <p className="text-sm font-medium text-white">{CONTENT_TYPE_META[slot.contentType].label}</p>
                                  {slot.targetCount > 1 ? (
                                    <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                                      {slot.targetCount}x
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-neutral-300">{slot.title || slot.plannedTitle || "Planned slot"}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                                  <span className={`rounded-full border px-2 py-0.5 ${status.classes}`}>{status.label}</span>
                                  {slot.ownerAgent ? <span>{slot.ownerAgent}</span> : null}
                                  {slot.platforms.length ? <span>{slot.platforms.join(", ")}</span> : null}
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-4 text-sm text-neutral-500">
              No blueprint rows are seeded for Season {selectedSeason}, Week {activeWeek} yet.
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function HighlightCard({ label, title, copy, tone }: { label: string; title: string; copy: string; tone: string }) {
  return <div className="surface-soft rounded-[22px] p-4"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone }} /><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p></div><p className="mt-3 text-base font-medium text-white">{title}</p><p className="mt-2 text-sm leading-relaxed text-neutral-400">{copy}</p></div>;
}

function AgentsSection({ loading, snapshots, cronSource }: { loading: boolean; snapshots: AgentSnapshot[]; cronSource: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (loading) return <SectionCard title="Agents" subtitle="Fleet health"><SkeletonRows rows={5} /></SectionCard>;
  if (!snapshots.length) return <SectionCard title="Agents" subtitle="Fleet health"><ErrorState message="Agent data is unavailable right now." /></SectionCard>;

  return (
    <SectionCard title="Agents" subtitle="Fleet health">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{snapshots.length} agents on deck</span>
        <span className="rounded-full border border-white/[0.08] px-2.5 py-1 uppercase tracking-[0.16em]">{cronSource === "supabase" ? "Live snapshot" : cronSource}</span>
      </div>
      <div className="space-y-3">
        {snapshots.map((snapshot) => {
          const spend = spendMeta(snapshot);
          const active = expanded === snapshot.id;
          const summary = snapshot.jobs[0] ? cronState(snapshot.jobs[0]) : ["#555555", "No data"] as const;
          return (
            <article key={snapshot.id} className="surface-soft overflow-hidden rounded-[24px]">
              <button type="button" onClick={() => setExpanded(active ? null : snapshot.id)} className="w-full p-3.5 text-left transition-colors hover:bg-white/[0.015] sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-white/[0.08] bg-black/25 text-[#FFB28F] sm:h-10 sm:w-10 sm:rounded-[18px]"><OrbitMiniIcon /></div>
                      <p className="text-base font-medium text-white">{snapshot.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${getVentureClasses(snapshot.venture)}`}>{snapshot.venture}</span>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: summary[0] }}>{snapshot.nextRunAt ? `Next ${formatTimeUntil(snapshot.nextRunAt)} - ${summary[1]}` : summary[1]}</p>
                  </div>
                  <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: summary[0] }} />
                </div>
                <div className="mt-3 sm:mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-500"><span>{spend.label}</span><span>{spend.detail}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${spend.percent}%`, backgroundColor: spend.tone }} /></div>
                </div>
              </button>
              {active ? <div className="grid gap-4 border-t border-white/[0.06] bg-black/15 p-3.5 sm:p-4 xl:grid-cols-[1.02fr_1fr]"><div className="space-y-4"><div className="surface-soft rounded-[22px] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Spend breakdown</p><div className="mt-3 grid grid-cols-2 gap-3">{["Today", "This week", "This month", "Remaining"].map((label, index) => <MetricBox key={label} label={label} value={index === 0 ? formatCurrency(snapshot.spend?.daily || 0) : index === 1 ? formatCurrency(snapshot.spend?.weekly || 0) : index === 2 ? formatCurrency(snapshot.spend?.monthly || 0) : snapshot.spend?.limitRemaining != null ? formatCurrency(snapshot.spend.limitRemaining) : "--"} />)}</div></div><div className="surface-soft rounded-[22px] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Active work</p><span className="text-sm text-neutral-400">{snapshot.activeWorkCount} item{snapshot.activeWorkCount === 1 ? "" : "s"}</span></div>{snapshot.workItems.length ? <div className="space-y-2">{snapshot.workItems.map((item) => <WorkItemRow key={item.id} item={item} />)}</div> : <p className="text-sm text-neutral-500">Nothing queued for this agent.</p>}</div></div><div className="surface-soft rounded-[22px] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Cron activity</p><span className="text-xs text-neutral-500">{snapshot.jobs.length} jobs</span></div><div className="space-y-2">{snapshot.jobs.length ? snapshot.jobs.map((job) => { const [tone, label] = cronState(job); return <div key={job.id} className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{job.name}</p><p className="mt-1 text-[11px] text-neutral-500">{job.schedule}</p></div><div className="flex items-center gap-2 text-[11px] text-neutral-400"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />{label}</div></div><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-neutral-400"><span>Last {formatTimeAgo(job.lastRunAt)}</span><span>Next {formatTimeUntil(job.nextRunAt)}</span><span>Duration {formatDuration(job.lastDurationMs)}</span></div></div>; }) : <p className="text-sm text-neutral-500">No cron jobs reported.</p>}</div></div></div> : null}
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-2.5 sm:p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-medium text-white">{value}</p></div>;
}

function ContentSection({
  loading,
  content,
  beacon,
  postiz,
  showHeader,
}: {
  loading: boolean;
  content: ContentPipelineResponse | null;
  beacon: BeaconResponse | null;
  postiz: PostizResponse | null;
  showHeader?: boolean;
}) {
  return (
    <ContentPipelineSection
      loading={loading}
      content={content}
      beacon={beacon}
      postiz={postiz}
      showHeader={showHeader}
    />
  );
}

function MetricsSection({
  loading,
  spend,
  beacon,
  cron,
  postiz,
  work,
  content,
  season,
  seasonMatrix,
}: {
  loading: boolean;
  spend: SpendResponse | null;
  beacon: BeaconResponse | null;
  cron: CronResponse | null;
  postiz: PostizResponse | null;
  work: WorkResponse;
  content: ContentPipelineResponse | null;
  season: SeasonResponse | null;
  seasonMatrix: SeasonMatrixResponse | null;
  compact: boolean;
}) {
  if (loading) return <SectionCard title="Metrics" subtitle="Business pulse"><SkeletonRows rows={5} /></SectionCard>;

  const weekStartMs = getCentralWeekStart().getTime();
  const weekProgress = currentWeekProgress();
  const projectedWeeklySpend = spend ? spend.totals.weekly / weekProgress : null;
  const spendTrend = spend?.trend?.slice(-14) || [];
  const topSpenders = [...(spend?.agents || [])].sort((left, right) => right.weekly - left.weekly).slice(0, 3);

  const touchedThisWeek = (content?.items || []).filter((item) => new Date(item.updatedAt).getTime() >= weekStartMs);
  const touchedByStatus = touchedThisWeek.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const currentSeason = season?.season.number || 1;
  const seasonSlots = (seasonMatrix?.slots || []).filter((slot) => slot.season === currentSeason);
  const ventureCoverage = MATRIX_VENTURES.map((venture) => {
    const slots = seasonSlots.filter((slot) => slot.venture === venture);
    const started = slots.filter((slot) => slot.status !== "not_started").length;
    return { venture, total: slots.length, started };
  }).filter((entry) => entry.total > 0);

  const beaconPerItem = touchedThisWeek.length ? Math.round((beacon?.thisWeekThoughts || 0) / touchedThisWeek.length) : null;
  const overdueCrons = (cron?.jobs || []).filter((job) => job.nextRunAt && new Date(job.nextRunAt).getTime() < Date.now() - 900000).length;
  const oldestItem = [...work.items].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0];
  const highPriority = work.items.filter((item) => ["high", "urgent"].includes(item.priority)).length;

  return (
    <SectionCard title="Metrics" subtitle="Business pulse">
      <div className="space-y-4">
        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Spend pace</p>
              <p className="mt-1 text-base font-medium text-white">Burn rate and projection</p>
            </div>
            <p className="text-sm text-neutral-500">{spendTrend.length ? `${spendTrend.length} day trend` : "Trend unavailable"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricBox label="This week" value={spend ? formatCurrency(spend.totals.weekly) : "--"} />
            <MetricBox label="Projected" value={projectedWeeklySpend ? formatCurrency(projectedWeeklySpend) : "--"} />
            <MetricBox label="Avg / day" value={spend ? formatCurrency(spend.totals.weekly / Math.max(1, weekProgress * 7)) : "--"} />
          </div>
          <div className="mt-4">
            <Sparkline values={spendTrend.map((entry) => entry.total)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            {topSpenders.length ? topSpenders.map((agent) => (
              <span key={agent.id} className="rounded-full border border-white/[0.08] px-2.5 py-1">
                {agent.name} {formatCurrency(agent.weekly)}
              </span>
            )) : <span>No spend data by agent</span>}
          </div>
        </div>

        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Production pace</p>
              <p className="mt-1 text-base font-medium text-white">Output, runway, and shipping velocity</p>
            </div>
            <p className="text-sm text-neutral-500">{touchedThisWeek.length} item{touchedThisWeek.length === 1 ? "" : "s"} moved this week</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricBox label="Drafted" value={String(touchedByStatus.drafted || 0)} />
            <MetricBox label="Review" value={String(touchedByStatus.review || 0)} />
            <MetricBox label="Scheduled" value={String(postiz?.summary?.scheduledThisWeek || 0)} />
            <MetricBox label="Published" value={String(postiz?.summary?.publishedThisWeek || 0)} />
          </div>
          <div className="mt-4 space-y-2">
            {ventureCoverage.length ? ventureCoverage.map((entry) => (
              <div key={entry.venture} className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 uppercase tracking-[0.14em] ${getVentureClasses(entry.venture)}`}>{entry.venture}</span>
                  <span className="text-neutral-500">{entry.started}/{entry.total} started</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#FF7D45]" style={{ width: `${entry.total ? (entry.started / entry.total) * 100 : 0}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-neutral-500">No season blueprint coverage yet.</p>}
          </div>
        </div>

        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Cognition vs output</p>
              <p className="mt-1 text-base font-medium text-white">Beacon pace relative to shipping</p>
            </div>
            <p className="text-sm text-neutral-500">{beacon?.thisWeekThoughts || 0} thoughts this week</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricBox label="Beacon" value={String(beacon?.thisWeekThoughts || 0)} />
            <MetricBox label="Items moved" value={String(touchedThisWeek.length)} />
            <MetricBox label="Thoughts / item" value={beaconPerItem != null ? String(beaconPerItem) : "--"} />
          </div>
          <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Read</p>
            <p className="mt-1 text-sm font-medium text-white">
              {touchedThisWeek.length
                ? `${beaconPerItem} Beacon thought${beaconPerItem === 1 ? "" : "s"} per item moved this week.`
                : "Beacon is active, but nothing has moved through the pipeline yet this week."}
            </p>
          </div>
        </div>

        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Operational health</p>
              <p className="mt-1 text-base font-medium text-white">Risk, queue age, and cron reliability</p>
            </div>
            <p className="text-sm text-neutral-500">{work.total} open item{work.total === 1 ? "" : "s"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricBox label="Cron errors" value={String(cron?.summary.errors || 0)} />
            <MetricBox label="Overdue crons" value={String(overdueCrons)} />
            <MetricBox label="High priority" value={String(highPriority)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Oldest open item</p>
              <p className="mt-1 text-sm font-medium text-white">{oldestItem?.title || "No active work"}</p>
              <p className="mt-2 text-xs text-neutral-500">{oldestItem ? `Age ${formatAge(oldestItem.createdAt)}` : "Queue is clear"}</p>
            </div>
            <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Next publish</p>
              <p className="mt-1 text-sm font-medium text-white">
                {postiz?.summary?.nextScheduled ? `${postiz.summary.nextScheduled.channel}` : "Nothing queued"}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {postiz?.summary?.nextScheduled?.scheduledDate
                  ? formatCentralDateTime(postiz.summary.nextScheduled.scheduledDate)
                  : "Publishing runway is empty"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) {
    return <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3 text-sm text-neutral-500">No trend data yet.</div>;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3">
      <svg viewBox="0 0 100 100" className="h-16 w-full overflow-visible" preserveAspectRatio="none">
        <polyline fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" points="0,100 100,100" />
        <polyline fill="none" stroke="#FF7D45" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
      </svg>
    </div>
  );
}

function WorkItemRow({ item }: { item: WorkItem }) {
  return <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3"><div className="flex flex-col gap-2"><p className="text-sm font-medium leading-relaxed text-white">{item.title}</p><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getWorkStatusClasses(item.status)}`}>{item.status.replace("_", " ")}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getVentureClasses(item.venture)}`}>{item.venture}</span></div></div>{item.description ? <p className="mt-3 text-sm leading-relaxed text-neutral-400">{item.description}</p> : null}<div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500"><span>{AGENTS.find((agent) => agent.id === item.assignedTo)?.name || item.assignedTo}</span><span>Age {formatAge(item.createdAt)}</span><span>Updated {formatCentralDateTime(item.updatedAt)}</span></div></div>;
}

function SkeletonRows({ rows }: { rows: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.03]" />)}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-200">{message}</div>;
}

function OverviewIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10.5V19h11v-8.5" /><path d="M10 19v-5h4v5" /></svg>; }
function SignalIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 19a7 7 0 0 1 14 0" /><path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>; }
function RobotIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="7" width="12" height="10" rx="3" /><path d="M12 3v4" /><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" /></svg>; }
function NotebookIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></svg>; }
function ChartIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-4" /></svg>; }
function OrbitMiniIcon() { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z" /></svg>; }
