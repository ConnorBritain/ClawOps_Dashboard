"use client";

import { useState } from "react";
import {
  getVentureClasses,
  type BeaconResponse,
  type ContentPipelineItem,
  type ContentPipelineResponse,
  type PostizResponse,
} from "@/lib/dashboard";
import { formatCentralDateTime, formatTimeAgo } from "@/lib/time";

const VENTURES = ["PE", "G2L", "Pidgeon", "Personal"] as const;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusMeta(status: ContentPipelineItem["status"]) {
  switch (status) {
    case "drafted":
      return ["Drafted", "bg-amber-500/10 text-amber-300 border-amber-500/20"] as const;
    case "review":
      return ["Review", "bg-violet-500/10 text-violet-300 border-violet-500/20"] as const;
    case "approved":
      return ["Approved", "bg-sky-500/10 text-sky-300 border-sky-500/20"] as const;
    case "scheduled":
      return ["Scheduled", "bg-blue-500/10 text-blue-300 border-blue-500/20"] as const;
    case "published":
      return ["Published", "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"] as const;
    default:
      return ["Idea", "bg-neutral-500/10 text-neutral-300 border-neutral-500/20"] as const;
  }
}

function platformBadge(platform: string | null) {
  if (!platform) {
    return "Platform TBD";
  }

  return labelize(platform);
}

function driveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

const selectClassName =
  "ml-2 rounded-full border border-white/[0.12] bg-[#121212] px-3 py-1.5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition-colors focus:border-[#FF7D45]/28 focus:text-white";

const selectStyle = { colorScheme: "dark" } as const;

function compactPillClass(active: boolean, activeClasses: string) {
  return active ? activeClasses : "border-white/[0.08] bg-black/20 text-neutral-400";
}

export function ContentPipelineSection({
  loading,
  content,
  beacon,
  postiz,
  showHeader = true,
}: {
  loading: boolean;
  content: ContentPipelineResponse | null;
  beacon: BeaconResponse | null;
  postiz: PostizResponse | null;
  showHeader?: boolean;
}) {
  const [venture, setVenture] = useState<(typeof VENTURES)[number]>("PE");
  const [socialVenture, setSocialVenture] = useState<(typeof VENTURES)[number]>("G2L");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("All");

  const items = content?.items || [];
  const types = Array.from(new Set(items.map((item) => item.type)));
  const filteredItems = items.filter((item) => {
    if (item.venture !== venture) {
      return false;
    }

    if (typeFilter !== "all" && item.type !== typeFilter) {
      return false;
    }

    return true;
  });

  const sources = Array.from(
    new Set((beacon?.recent || []).map((activity) => activity.source).filter(Boolean))
  );
  const filteredBeacon = (beacon?.recent || []).filter((activity) =>
    sourceFilter === "All" ? true : activity.source === sourceFilter
  );

  const postizById = new Map((postiz?.posts || []).map((post) => [post.id, post]));
  const socialPosts = items.filter(
    (item) => item.type === "social_post" && item.venture === socialVenture
  );
  const socialPlatforms = socialPosts.reduce<Record<string, number>>((acc, item) => {
    const key = item.platform || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <section className="card p-3.5 sm:p-5">
        {showHeader ? (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Publishing flow</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Content</h3>
          </div>
        ) : null}
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card p-3.5 sm:p-5">
      {showHeader ? (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Publishing flow</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Content</h3>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="surface-strong rounded-[22px] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Pipeline</p>
              <p className="mt-1 text-[15px] font-medium text-white">
                Live publishing state.
              </p>
            </div>
            <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[11px] text-neutral-400">
              {items.length} items
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {VENTURES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setVenture(entry)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                compactPillClass(venture === entry, `${getVentureClasses(entry)}`)
              )}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-neutral-500">
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className={selectClassName}
              style={selectStyle}
            >
              <option value="all">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {labelize(type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2.5">
          {filteredItems.length ? (
            filteredItems.map((item) => {
              const [statusLabel, statusClasses] = statusMeta(item.status);
              return (
                <div key={item.id} className="surface-soft rounded-[20px] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-medium text-white">{item.title}</p>
                        <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                          {labelize(item.type)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${statusClasses}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                        {item.createdBy ? <span>{item.createdBy}</span> : null}
                        {item.platform ? <span>{platformBadge(item.platform)}</span> : null}
                        {item.week ? <span>Week {item.week}</span> : null}
                        <span>Updated {formatCentralDateTime(item.updatedAt)}</span>
                      </div>
                      {item.notes ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-neutral-400 sm:text-sm">{item.notes}</p>
                      ) : null}
                    </div>
                    {item.driveLink ? (
                      <a
                        href={item.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/[0.08] bg-black/20 p-2 text-neutral-300 transition-colors hover:text-white"
                        title="Open draft"
                      >
                        {driveIcon()}
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-neutral-500">
              No content items for this venture and filter yet.
            </div>
          )}
        </div>

        <div className="surface-soft rounded-[22px] p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Social</p>
              <p className="mt-1 text-[15px] font-medium text-white">Venture-specific social queue</p>
            </div>
            <a
              href="https://platform.postiz.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[11px] text-neutral-300 transition-colors hover:text-white"
            >
              Open Postiz
            </a>
          </div>

          {postiz?.summary ? (
            <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1">
                Scheduled {postiz.summary.scheduledThisWeek}
              </span>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1">
                Published {postiz.summary.publishedThisWeek}
              </span>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1">
                Drafts {postiz.summary.draftCount}
              </span>
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap gap-2">
            {VENTURES.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setSocialVenture(entry)}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  compactPillClass(socialVenture === entry, `${getVentureClasses(entry)}`)
                )}
              >
                {entry}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            {Object.keys(socialPlatforms).length ? (
              Object.entries(socialPlatforms).map(([platform, count]) => (
                <span key={platform} className="rounded-full border border-white/[0.08] px-2.5 py-1">
                  {labelize(platform)} · {count}
                </span>
              ))
            ) : (
              <span>No social posts queued</span>
            )}
          </div>

          <div className="space-y-1.5">
            {socialPosts.length ? (
              socialPosts.map((item) => {
                const [statusLabel, statusClasses] = statusMeta(item.status);
                const postizPost = item.postizId ? postizById.get(item.postizId) : null;
                return (
                  <div key={item.id} className="rounded-[16px] border border-white/[0.06] bg-black/20 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                          <span>{platformBadge(item.platform)}</span>
                          <span>{postizPost?.scheduledDate ? formatCentralDateTime(postizPost.scheduledDate) : "Not scheduled"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.driveLink ? (
                          <a
                            href={item.driveLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/[0.08] bg-black/20 p-2 text-neutral-300 transition-colors hover:text-white"
                            title="Open draft"
                          >
                            {driveIcon()}
                          </a>
                        ) : null}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${statusClasses}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[16px] border border-white/[0.06] bg-black/20 p-2.5 text-sm text-neutral-500">
                No social posts for this venture yet.
              </div>
            )}
          </div>
        </div>

        <div className="surface-soft rounded-[22px] p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Beacon</p>
              <p className="mt-1 text-[15px] font-medium text-white">Recent activity</p>
            </div>
            <label className="text-xs text-neutral-500">
              Source
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className={selectClassName}
                style={selectStyle}
              >
                <option>All</option>
                {sources.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredBeacon.length ? (
            <div className="space-y-1.5">
              {filteredBeacon.map((activity) => (
                <div key={activity.id} className="rounded-[16px] border border-white/[0.06] bg-black/20 p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-neutral-200">{activity.text}</p>
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
            <p className="text-sm text-neutral-500">No Beacon activity for this source yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
