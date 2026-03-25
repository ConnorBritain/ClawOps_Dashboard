import { NextResponse } from "next/server";
import { getSeasonState } from "@/lib/seasons";

export const revalidate = 300;

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

type ContentType = "pattern-card" | "currents" | "challenge-lab" | "build-note";
type ContentStatus = "not-started" | "drafted" | "reviewed" | "published";

interface ContentDefinition {
  type: ContentType;
  label: string;
  cadence: string;
  venture: string;
  summary: {
    preLaunch: string;
    live: string;
  };
  keywords: string[];
}

interface WorkQueueItem {
  id: string;
  title: string;
  assigned_to: string | null;
  status: string;
  venture: string;
  updated_at: string;
  description: string | null;
}

const CONTENT_DEFINITIONS: ContentDefinition[] = [
  {
    type: "pattern-card",
    label: "Pattern Card",
    cadence: "Weekly",
    venture: "PE",
    summary: {
      preLaunch: "Season 1 prep for the first Pattern Card.",
      live: "Weekly Pattern Engine pattern drop.",
    },
    keywords: ["pattern card", "pattern note", "weekly essay", "signal card"],
  },
  {
    type: "currents",
    label: "Currents Newsletter",
    cadence: "Weekly Tue",
    venture: "G2L",
    summary: {
      preLaunch: "Newsletter runway and April 1 launch prep.",
      live: "Weekly Tuesday Currents send.",
    },
    keywords: ["currents", "newsletter", "beehiiv"],
  },
  {
    type: "challenge-lab",
    label: "Challenge Lab",
    cadence: "Biweekly",
    venture: "G2L",
    summary: {
      preLaunch: "Challenge Lab prep and launch sequencing.",
      live: "Biweekly Challenge Lab release.",
    },
    keywords: ["challenge lab", "challenge", "skool"],
  },
  {
    type: "build-note",
    label: "Social Posts",
    cadence: "Always on",
    venture: "Shared",
    summary: {
      preLaunch: "Launch-week social and teaser queue.",
      live: "Social distribution and post queue.",
    },
    keywords: ["social", "post", "linkedin", "thread", "tweet", "x post"],
  },
];

function mapWorkStatus(status: string): ContentStatus {
  switch (status) {
    case "done":
      return "published";
    case "review":
      return "reviewed";
    case "in_progress":
    case "confirmed":
    case "queued":
      return "drafted";
    default:
      return "not-started";
  }
}

function getHighestStatus(items: WorkQueueItem[]) {
  const weights: Record<ContentStatus, number> = {
    "not-started": 0,
    drafted: 1,
    reviewed: 2,
    published: 3,
  };

  return items.reduce<ContentStatus>((current, item) => {
    const next = mapWorkStatus(item.status);
    return weights[next] > weights[current] ? next : current;
  }, "not-started");
}

function matchesKeywords(item: WorkQueueItem, keywords: string[]) {
  const haystack = `${item.title} ${item.description || ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

export async function GET() {
  const season = getSeasonState();
  const isPreLaunch = season.weekInSeason === 0;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({
      items: CONTENT_DEFINITIONS.map((definition) => ({
        label: definition.label,
        type: definition.type,
        status: "not-started",
        source: "",
        lastUpdate: null,
        cadence: definition.cadence,
        venture: definition.venture,
        summary: isPreLaunch ? definition.summary.preLaunch : definition.summary.live,
        workItemCount: 0,
        latestTitle: null,
        assignedTo: [],
      })),
      isPreLaunch,
      phaseLabel: isPreLaunch ? "Season 1 prep" : "Active publishing cadence",
      error: "No Supabase credentials",
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/work_queue`);
    url.searchParams.set(
      "select",
      "id,title,assigned_to,status,venture,updated_at,description"
    );
    url.searchParams.set("or", "(venture.eq.pattern-engine,venture.eq.g2l)");
    url.searchParams.set("order", "updated_at.desc");
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({
        items: [],
        isPreLaunch,
        phaseLabel: isPreLaunch ? "Season 1 prep" : "Active publishing cadence",
        error: `Supabase ${res.status}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    const rows: WorkQueueItem[] = await res.json();
    const items = CONTENT_DEFINITIONS.map((definition) => {
      const matches = rows.filter((item) => matchesKeywords(item, definition.keywords));
      const latest = matches[0];

      return {
        label: definition.label,
        type: definition.type,
        status: getHighestStatus(matches),
        source: latest?.assigned_to || "",
        lastUpdate: latest?.updated_at || null,
        cadence: definition.cadence,
        venture: definition.venture,
        summary: isPreLaunch ? definition.summary.preLaunch : definition.summary.live,
        workItemCount: matches.length,
        latestTitle: latest?.title || null,
        assignedTo: Array.from(
          new Set(matches.map((item) => item.assigned_to).filter(Boolean))
        ) as string[],
      };
    });

    return NextResponse.json({
      items,
      isPreLaunch,
      phaseLabel: isPreLaunch ? "Season 1 prep" : "Active publishing cadence",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        isPreLaunch,
        phaseLabel: isPreLaunch ? "Season 1 prep" : "Active publishing cadence",
        error: `Failed to fetch content status: ${String(error)}`,
      },
      { status: 500 }
    );
  }
}
