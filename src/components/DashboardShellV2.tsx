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
  formatPercent,
  getVentureClasses,
  getWorkStatusClasses,
  type AgentSnapshot,
  type BeaconResponse,
  type ContentItem,
  type ContentStatusResponse,
  type CronJobSummary,
  type CronResponse,
  type DashboardTab,
  type PostizResponse,
  type SeasonResponse,
  type SpendResponse,
  type WorkItem,
  type WorkResponse,
} from "@/lib/dashboard";
import {
  formatAge,
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

const EMPTY_WORK: WorkResponse = { items: [], byAgent: {}, byStatus: {}, total: 0 };

const tabMeta: Record<DashboardTab, { label: string; eyebrow: string; icon: ReactNode }> = {
  season: { label: "Season", eyebrow: "Fiscal rhythm", icon: <SignalIcon /> },
  agents: { label: "Agents", eyebrow: "Fleet health", icon: <RobotIcon /> },
  content: { label: "Content", eyebrow: "Publishing flow", icon: <NotebookIcon /> },
  metrics: { label: "Metrics", eyebrow: "Business pulse", icon: <ChartIcon /> },
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
  return DASHBOARD_TABS.includes(value as DashboardTab) ? (value as DashboardTab) : "season";
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

function contentMeta(status: ContentItem["status"]) {
  if (status === "published") return ["Published", "#4ADE80", "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"] as const;
  if (status === "reviewed") return ["In Review", "#60A5FA", "bg-sky-500/10 text-sky-300 border-sky-500/20"] as const;
  if (status === "drafted") return ["Drafted", "#FBBF24", "bg-amber-500/10 text-amber-300 border-amber-500/20"] as const;
  return ["Not Started", "#555555", "bg-neutral-500/10 text-neutral-300 border-neutral-500/20"] as const;
}

export default function DashboardShellV2() {
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
    async function load() {
      const [season, spend, cron, work, beacon, content, postiz] = await Promise.all([
        fetchResource<SeasonResponse>("/api/season"),
        fetchResource<SpendResponse>("/api/spend"),
        fetchResource<CronResponse>("/api/cron"),
        fetchResource<WorkResponse>("/api/work"),
        fetchResource<BeaconResponse>("/api/beacon"),
        fetchResource<ContentStatusResponse>("/api/content-status"),
        fetchResource<PostizResponse>("/api/postiz"),
      ]);
      if (cancelled) return;
      setData({ season, spend, cron, work, beacon, content, postiz });
      setLoading(false);
    }
    setLoading(true);
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleTabChange(nextTab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "season") params.delete("tab");
    else params.set("tab", nextTab);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  const agentSnapshots = buildAgentSnapshots(data.spend, data.cron, data.work);
  const workData = data.work || EMPTY_WORK;

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
      <header className="card surface-strong mb-5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="rounded-[20px] border border-white/10 bg-black/25 p-2.5">
              <Image src="/clawops-logo.png" alt="ClawOps" width={44} height={44} className="rounded-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#FFB28F]">Pattern Engine Ops</p>
              <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">ClawOps Dashboard</h1>
              <p className="mt-1 max-w-xl text-sm text-neutral-400">Dark, dense, coffee-check-ready command view for the fleet.</p>
            </div>
          </div>
          <RefreshButton />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeaderMetric label="Weekly spend" value={data.spend ? formatCurrency(data.spend.totals.weekly) : "--"} tone="#FF7D45" />
          <HeaderMetric label="Open work" value={String(workData.total)} tone="#DC97FF" />
          <HeaderMetric label="Beacon thoughts" value={data.beacon ? String(data.beacon.totalThoughts) : "--"} tone="#60A5FA" />
          <HeaderMetric label="Cron source" value={data.cron?.source || "--"} tone={data.cron?.source === "supabase" ? "#4ADE80" : "#FBBF24"} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickLinks.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-[11px] text-neutral-400 transition-all hover:border-white/[0.12] hover:text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7D45]" />
              {label}
            </a>
          ))}
        </div>
      </header>

      <div className="lg:hidden">
        <TabHeading activeTab={activeTab} />
        <div className="dashboard-fade">{renderTab(activeTab, loading, data, agentSnapshots, workData)}</div>
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-12">
        <div className="col-span-7"><SeasonSection loading={loading} season={data.season} /></div>
        <div className="col-span-5"><MetricsSection loading={loading} spend={data.spend} beacon={data.beacon} cron={data.cron} postiz={data.postiz} work={workData} compact /></div>
        <div className="col-span-7"><AgentsSection loading={loading} snapshots={agentSnapshots} cronSource={data.cron?.source || "unknown"} /></div>
        <div className="col-span-5"><ContentSection loading={loading} content={data.content} beacon={data.beacon} /></div>
      </div>

      <footer className="mt-8 hidden items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-neutral-600 lg:flex">
        <p>Pattern Engine LLC · ops.patternengine.ai</p>
        <p>Connor coffee-check ready at 375px</p>
      </footer>

      <MobileTabBar activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}

function renderTab(tab: DashboardTab, loading: boolean, data: DashboardData, agents: AgentSnapshot[], work: WorkResponse) {
  if (tab === "season") return <SeasonSection loading={loading} season={data.season} />;
  if (tab === "agents") return <AgentsSection loading={loading} snapshots={agents} cronSource={data.cron?.source || "unknown"} />;
  if (tab === "content") return <ContentSection loading={loading} content={data.content} beacon={data.beacon} />;
  return <MetricsSection loading={loading} spend={data.spend} beacon={data.beacon} cron={data.cron} postiz={data.postiz} work={work} compact={false} />;
}

function HeaderMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="surface-soft rounded-[22px] px-3 py-3"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p><p className="mt-2 text-lg font-semibold" style={{ color: tone }}>{value}</p></div>;
}

function TabHeading({ activeTab }: { activeTab: DashboardTab }) {
  return <div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">{tabMeta[activeTab].eyebrow}</p><h2 className="mt-1 text-2xl font-semibold text-white">{tabMeta[activeTab].label}</h2></div><div className="rounded-full border border-[#FF7D45]/20 bg-[#FF7D45]/8 px-3 py-1 text-[11px] text-[#FFB28F]">Mobile screen</div></div>;
}

function MobileTabBar({ activeTab, onChange }: { activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#111111]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-1">
        {DASHBOARD_TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => onChange(tab)} className={cx("flex min-h-[56px] flex-1 flex-col items-center justify-center rounded-[18px] text-[10px] transition-all", tab === activeTab ? "border border-[#FF7D45]/20 bg-[#FF7D45]/10 text-[#FFB28F]" : "text-neutral-500")}>
            {tabMeta[tab].icon}
            <span className="mt-1">{tabMeta[tab].label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="card"><div className="mb-4"><p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{subtitle}</p><h3 className="mt-1 text-lg font-semibold text-white">{title}</h3></div>{children}</section>;
}

function SeasonSection({ loading, season }: { loading: boolean; season: SeasonResponse | null }) {
  if (loading) return <SectionCard title="Season" subtitle="Fiscal rhythm"><SkeletonRows rows={4} /></SectionCard>;
  if (!season) return <SectionCard title="Season" subtitle="Fiscal rhythm"><ErrorState message="Season data is unavailable right now." /></SectionCard>;

  const preLaunch = season.weekInSeason === 0;
  const labels = ["Signal", "Systems", "Machines", "Stewardship"];

  return (
    <SectionCard title="Season" subtitle={preLaunch ? "Pre-launch countdown" : "Fiscal rhythm"}>
      <div className="surface-strong rounded-[26px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[#FFB28F]">Season {preLaunch ? "1: Signal" : `${season.season.number}: ${season.season.name}`}</p>
            <h4 className="mt-1 text-3xl font-semibold text-white sm:text-[2.35rem]">
              {preLaunch ? "Launch sequence running" : `Week ${season.weekInSeason} of 13`}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {preLaunch ? "The fiscal year anchor begins on April 1, 2026. Until then the dashboard stays in countdown mode." : season.season.theme}
            </p>
            <p className="mt-3 text-sm text-neutral-500">Pattern machines are here. Wisdom is optional.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-black/25 px-5 py-4 text-center sm:min-w-[134px]">
            <p className="text-6xl font-semibold tracking-[-0.04em] text-[#FF7D45] sm:text-7xl">{season.daysUntilNextSeason}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-neutral-500">{preLaunch ? "days" : "to next"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <HighlightCard label="Pattern card" title={season.pattern.name} copy={season.pattern.description} tone={season.season.color} />
          {season.challenge ? <HighlightCard label={preLaunch ? "First challenge lab" : `Challenge #${season.challengeNumber}`} title={season.challenge.name} copy={season.challenge.humanQuestion} tone="#DC97FF" /> : null}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="absolute left-6 right-6 top-6 hidden h-px bg-[linear-gradient(90deg,rgba(255,125,69,0.26),rgba(255,255,255,0.08),rgba(220,151,255,0.24))] sm:block" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {labels.map((label, index) => (
            <div key={label} className={cx("surface-soft rounded-[22px] px-3 py-3", index === 0 && "border-[#FF7D45]/16 bg-[#FF7D45]/[0.05]")}>
              <div className="mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: index === 0 ? "#FF7D45" : "rgba(255,255,255,0.2)" }} /><p className="text-xs font-medium text-white">{label}</p></div>
              <p className="text-[11px] text-neutral-500">{index === 0 ? "Next up" : "Later in cycle"}</p>
            </div>
          ))}
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
              <button type="button" onClick={() => setExpanded(active ? null : snapshot.id)} className="w-full p-4 text-left transition-colors hover:bg-white/[0.015]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/[0.08] bg-black/25 text-[#FFB28F]"><OrbitMiniIcon /></div>
                      <p className="text-base font-medium text-white">{snapshot.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${getVentureClasses(snapshot.venture)}`}>{snapshot.venture}</span>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: summary[0] }}>{snapshot.nextRunAt ? `Next ${formatTimeUntil(snapshot.nextRunAt)} · ${summary[1]}` : summary[1]}</p>
                  </div>
                  <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: summary[0] }} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-500"><span>{spend.label}</span><span>{spend.detail}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${spend.percent}%`, backgroundColor: spend.tone }} /></div>
                </div>
              </button>
              {active ? <div className="grid gap-4 border-t border-white/[0.06] bg-black/15 p-4 xl:grid-cols-[1.02fr_1fr]"><div className="space-y-4"><div className="surface-soft rounded-[22px] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Spend breakdown</p><div className="mt-3 grid grid-cols-2 gap-3">{["Today", "This week", "This month", "Remaining"].map((label, index) => <MetricBox key={label} label={label} value={index === 0 ? formatCurrency(snapshot.spend?.daily || 0) : index === 1 ? formatCurrency(snapshot.spend?.weekly || 0) : index === 2 ? formatCurrency(snapshot.spend?.monthly || 0) : snapshot.spend?.limitRemaining != null ? formatCurrency(snapshot.spend.limitRemaining) : "--"} />)}</div></div><div className="surface-soft rounded-[22px] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Active work</p><span className="text-sm text-neutral-400">{snapshot.activeWorkCount} item{snapshot.activeWorkCount === 1 ? "" : "s"}</span></div>{snapshot.workItems.length ? <div className="space-y-2">{snapshot.workItems.map((item) => <WorkItemRow key={item.id} item={item} />)}</div> : <p className="text-sm text-neutral-500">Nothing queued for this agent.</p>}</div></div><div className="surface-soft rounded-[22px] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Cron activity</p><span className="text-xs text-neutral-500">{snapshot.jobs.length} jobs</span></div><div className="space-y-2">{snapshot.jobs.length ? snapshot.jobs.map((job) => { const [tone, label] = cronState(job); return <div key={job.id} className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{job.name}</p><p className="mt-1 text-[11px] text-neutral-500">{job.schedule}</p></div><div className="flex items-center gap-2 text-[11px] text-neutral-400"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />{label}</div></div><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-neutral-400"><span>Last {formatTimeAgo(job.lastRunAt)}</span><span>Next {formatTimeUntil(job.nextRunAt)}</span><span>Duration {formatDuration(job.lastDurationMs)}</span></div></div>; }) : <p className="text-sm text-neutral-500">No cron jobs reported.</p>}</div></div></div> : null}
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-medium text-white">{value}</p></div>;
}

function ContentSection({ loading, content, beacon }: { loading: boolean; content: ContentStatusResponse | null; beacon: BeaconResponse | null }) {
  if (loading) return <SectionCard title="Content" subtitle="Publishing flow"><SkeletonRows rows={5} /></SectionCard>;
  const items = content?.items || [];
  const recent = beacon?.recent || [];

  return (
    <SectionCard title="Content" subtitle="Publishing flow">
      <div className="space-y-4">
        <div className="surface-strong rounded-[24px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{content?.phaseLabel || "Publishing cadence"}</p>
              <p className="mt-1 text-base font-medium text-white">{content?.isPreLaunch ? "Content is aligned to Season 1 prep, not a fake active week." : "Weekly and biweekly content lanes are tracking real work queue items."}</p>
            </div>
            <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-400">{items.length} lanes</span>
          </div>
        </div>

        <div className="space-y-3">
          {items.length ? items.map((item) => <ContentLane key={item.type} item={item} />) : <ErrorState message="Content pipeline data is unavailable right now." />}
        </div>

        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Beacon feed</p><p className="mt-1 text-base font-medium text-white">Recent activity</p></div>
            {beacon ? <span className="text-xs text-neutral-500">{beacon.thisWeekThoughts} this week</span> : null}
          </div>
          {recent.length ? <div className="space-y-2">{recent.slice(0, 6).map((activity) => <div key={activity.id} className="rounded-[18px] border border-white/[0.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm leading-relaxed text-neutral-200">{activity.text}</p><p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">{activity.type || "thought"}</p></div><div className="text-right text-[11px] text-neutral-500"><p>{activity.source}</p><p className="mt-1">{formatTimeAgo(activity.createdAt)}</p></div></div></div>)}</div> : <p className="text-sm text-neutral-500">No recent Beacon activity yet.</p>}
        </div>
      </div>
    </SectionCard>
  );
}

function ContentLane({ item }: { item: ContentItem }) {
  const [label, tone, classes] = contentMeta(item.status);
  const steps: ContentItem["status"][] = ["not-started", "drafted", "reviewed", "published"];
  const currentStep = steps.indexOf(item.status);
  return (
    <div className="surface-soft rounded-[24px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-white">{item.label}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getVentureClasses(item.venture)}`}>{item.venture}</span>
            <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400">{item.cadence}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">{item.summary}</p>
          <p className="mt-2 text-xs text-neutral-500">{item.lastUpdate ? `Updated ${formatCentralDateTime(item.lastUpdate)}` : "No linked work captured yet"}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${classes}`}>{label}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">{steps.map((step, index) => <div key={step} className="h-2 rounded-full" style={{ backgroundColor: index <= currentStep ? tone : "rgba(255,255,255,0.07)" }} />)}</div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500"><span>{item.workItemCount} linked item{item.workItemCount === 1 ? "" : "s"}</span>{item.assignedTo.length ? <span>{item.assignedTo.join(", ")}</span> : null}</div>
      {item.latestTitle ? <p className="mt-3 text-sm text-neutral-200">{item.latestTitle}</p> : null}
    </div>
  );
}

function MetricsSection({ loading, spend, beacon, cron, postiz, work, compact }: { loading: boolean; spend: SpendResponse | null; beacon: BeaconResponse | null; cron: CronResponse | null; postiz: PostizResponse | null; work: WorkResponse; compact: boolean }) {
  if (loading) return <SectionCard title="Metrics" subtitle="Business pulse"><SkeletonRows rows={5} /></SectionCard>;
  const cards = [
    ["OpenRouter", spend ? formatCurrency(spend.totals.weekly) : "--", spend ? `${formatCurrency(spend.totals.daily)} today · ${formatCurrency(spend.totals.monthly)} month` : "Spend feed unavailable", "#FF7D45"],
    ["Beacon", beacon ? String(beacon.totalThoughts) : "--", beacon ? `${beacon.thisWeekThoughts} thoughts this week` : "Beacon feed unavailable", "#DC97FF"],
    ["Scheduled", postiz?.summary ? String(postiz.summary.scheduledThisWeek) : "--", "Postiz posts queued this week", "#60A5FA"],
    ["Published", postiz?.summary ? String(postiz.summary.publishedThisWeek) : "--", cron?.summary.errors ? `${cron.summary.errors} cron issues` : "Crons stable", cron?.summary.errors ? "#F87171" : "#4ADE80"],
  ] as const;

  return (
    <SectionCard title="Metrics" subtitle="Business pulse">
      <div className="space-y-4">
        <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>{cards.map(([label, value, detail, tone]) => <div key={label} className="surface-soft rounded-[24px] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p><p className="mt-3 text-2xl font-semibold" style={{ color: tone }}>{value}</p><p className="mt-2 text-xs leading-relaxed text-neutral-500">{detail}</p></div>)}</div>
        <div className="surface-soft rounded-[24px] p-4">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Postiz</p><p className="mt-1 text-base font-medium text-white">Publishing activity</p></div><span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-400">{postiz?.total || 0} posts</span></div>
          {postiz?.summary ? <><div className="grid grid-cols-3 gap-3"><MetricBox label="Scheduled" value={String(postiz.summary.scheduledThisWeek)} /><MetricBox label="Published" value={String(postiz.summary.publishedThisWeek)} /><MetricBox label="Drafts" value={String(postiz.summary.draftCount)} /></div><div className="mt-3 rounded-[18px] border border-white/[0.06] bg-black/20 p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Next scheduled</p><p className="mt-1 text-sm font-medium text-white">{postiz.summary.nextScheduled ? `${formatCentralDateTime(postiz.summary.nextScheduled.scheduledDate)} · ${postiz.summary.nextScheduled.channel}` : "No scheduled post this week"}</p></div></> : <p className="text-sm text-neutral-500">Postiz feed unavailable right now.</p>}
        </div>
        <WorkQueuePanel work={work} />
      </div>
    </SectionCard>
  );
}

function WorkQueuePanel({ work }: { work: WorkResponse }) {
  const ordered = Object.entries(work.byAgent).sort(([a], [b]) => a.localeCompare(b));
  return <div className="surface-soft rounded-[24px] p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Work queue</p><p className="mt-1 text-base font-medium text-white">Active items grouped by agent</p></div><span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-400">{work.total} open</span></div>{ordered.length ? <div className="space-y-3">{ordered.map(([agentId, items]) => <div key={agentId} className="rounded-[22px] border border-white/[0.06] bg-black/20 p-3"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium text-white">{AGENTS.find((agent) => agent.id === agentId)?.name || agentId}</p><span className="text-xs text-neutral-500">{items.length} item{items.length === 1 ? "" : "s"}</span></div><div className="space-y-2">{items.map((item) => <WorkItemRow key={item.id} item={item} />)}</div></div>)}</div> : <p className="text-sm text-neutral-500">No active work items in Beacon right now.</p>}</div>;
}

function WorkItemRow({ item }: { item: WorkItem }) {
  return <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 text-sm font-medium text-white">{item.title}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getWorkStatusClasses(item.status)}`}>{item.status.replace("_", " ")}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${getVentureClasses(item.venture)}`}>{item.venture}</span></div>{item.description ? <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.description}</p> : null}<div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500"><span>{AGENTS.find((agent) => agent.id === item.assignedTo)?.name || item.assignedTo}</span><span>Age {formatAge(item.createdAt)}</span><span>Updated {formatCentralDateTime(item.updatedAt)}</span></div></div>;
}

function SkeletonRows({ rows }: { rows: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.03]" />)}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-200">{message}</div>;
}

function SignalIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 19a7 7 0 0 1 14 0" /><path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>; }
function RobotIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="7" width="12" height="10" rx="3" /><path d="M12 3v4" /><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" /></svg>; }
function NotebookIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></svg>; }
function ChartIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-4" /></svg>; }
function OrbitMiniIcon() { return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z" /></svg>; }
