import { NextResponse } from "next/server";
import { type GrowthDailyPoint, type GrowthFreshness, type GrowthResponse, type GrowthSourceName, type GrowthSourceSummary } from "@/lib/dashboard";

export const revalidate = 900;

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

type RawGrowthRow = Record<string, unknown>;

function pickString(row: RawGrowthRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length) {
      return value;
    }
  }
  return null;
}

function pickNumber(row: RawGrowthRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.length) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function mapVenture(value: string | null): GrowthSourceSummary["venture"] {
  switch (value) {
    case "pattern-engine":
      return "PE";
    case "g2l":
      return "G2L";
    case "pidgeon":
      return "Pidgeon";
    case "personal":
      return "Personal";
    default:
      return "PE";
  }
}

function mapSource(value: string | null): GrowthSourceName {
  switch (value) {
    case "skool":
    case "substack":
    case "beehiiv":
    case "manual":
      return value;
    default:
      return "manual";
  }
}

function mapFreshness(value: string | null): GrowthFreshness {
  switch (value) {
    case "fresh":
    case "stale":
    case "expired":
    case "no_data":
      return value;
    default:
      return "no_data";
  }
}

function formatDateFilter(daysBack: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function withFallbackDelta(row: RawGrowthRow, metric: string, days: "7d" | "30d") {
  return pickNumber(row, [
    `${metric}_delta_${days}`,
    `${metric}_${days}_delta`,
    `delta_${days}_${metric}`,
    `${days}_${metric}_delta`,
  ]);
}

function mapDailyPoint(row: RawGrowthRow): GrowthDailyPoint {
  return {
    day: pickString(row, ["day"]) || "",
    members: pickNumber(row, ["members"]),
    freeSubscribers: pickNumber(row, ["free_subscribers", "freeSubscribers"]),
    paidSubscribers: pickNumber(row, ["paid_subscribers", "paidSubscribers"]),
    followers: pickNumber(row, ["followers"]),
    mrr: pickNumber(row, ["mrr"]),
    arr: pickNumber(row, ["arr"]),
  };
}

function mapRow(row: RawGrowthRow, daily: GrowthDailyPoint[]): GrowthSourceSummary {
  return {
    entityKey: pickString(row, ["entity_key", "entityKey"]) || "unknown-source",
    source: mapSource(pickString(row, ["source"])),
    venture: mapVenture(pickString(row, ["venture"])),
    label: pickString(row, ["label"]) || "Untitled source",
    url: pickString(row, ["url"]),
    collectionMethod: pickString(row, ["collection_method", "collectionMethod"]) || "manual",
    freshness: mapFreshness(pickString(row, ["freshness"])),
    capturedAt: pickString(row, ["captured_at", "capturedAt"]),
    current: {
      members: pickNumber(row, ["members"]),
      freeSubscribers: pickNumber(row, ["free_subscribers", "freeSubscribers"]),
      paidSubscribers: pickNumber(row, ["paid_subscribers", "paidSubscribers"]),
      followers: pickNumber(row, ["followers"]),
      mrr: pickNumber(row, ["mrr"]),
      arr: pickNumber(row, ["arr"]),
      conversionRate: pickNumber(row, ["conversion_rate", "conversionRate"]),
      retentionRate: pickNumber(row, ["retention_rate", "retentionRate"]),
    },
    delta7d: {
      members: withFallbackDelta(row, "members", "7d"),
      freeSubscribers: withFallbackDelta(row, "free_subscribers", "7d"),
      paidSubscribers: withFallbackDelta(row, "paid_subscribers", "7d"),
      followers: withFallbackDelta(row, "followers", "7d"),
      mrr: withFallbackDelta(row, "mrr", "7d"),
      arr: withFallbackDelta(row, "arr", "7d"),
    },
    delta30d: {
      members: withFallbackDelta(row, "members", "30d"),
      freeSubscribers: withFallbackDelta(row, "free_subscribers", "30d"),
      paidSubscribers: withFallbackDelta(row, "paid_subscribers", "30d"),
      followers: withFallbackDelta(row, "followers", "30d"),
      mrr: withFallbackDelta(row, "mrr", "30d"),
      arr: withFallbackDelta(row, "arr", "30d"),
    },
    daily,
  };
}

function sumNullable(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => value != null);
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) : null;
}

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json<GrowthResponse>({
      sources: [],
      summary: {
        tracked: 0,
        fresh: 0,
        stale: 0,
        expired: 0,
        totalMembers: null,
        totalSubscribers: null,
        totalPaidSubscribers: null,
        totalMRR: null,
      },
      error: "No Supabase credentials",
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const overviewUrl = new URL(`${SUPABASE_URL}/rest/v1/growth_overview_view`);
    overviewUrl.searchParams.set("select", "*");
    overviewUrl.searchParams.set("order", "venture.asc,source.asc,label.asc");

    const dailyUrl = new URL(`${SUPABASE_URL}/rest/v1/growth_daily_view`);
    dailyUrl.searchParams.set("select", "*");
    dailyUrl.searchParams.set("day", `gte.${formatDateFilter(30)}`);
    dailyUrl.searchParams.set("order", "entity_key.asc,day.asc");

    const [overviewResponse, dailyResponse] = await Promise.all([
      fetch(overviewUrl.toString(), {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 900 },
      }),
      fetch(dailyUrl.toString(), {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 900 },
      }),
    ]);

    if (!overviewResponse.ok || !dailyResponse.ok) {
      return NextResponse.json<GrowthResponse>({
        sources: [],
        summary: {
          tracked: 0,
          fresh: 0,
          stale: 0,
          expired: 0,
          totalMembers: null,
          totalSubscribers: null,
          totalPaidSubscribers: null,
          totalMRR: null,
        },
        error: `Supabase ${overviewResponse.ok ? dailyResponse.status : overviewResponse.status}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    const [overviewRows, dailyRows]: [RawGrowthRow[], RawGrowthRow[]] = await Promise.all([
      overviewResponse.json(),
      dailyResponse.json(),
    ]);

    const dailyBySource = dailyRows.reduce<Record<string, GrowthDailyPoint[]>>((acc, row) => {
      const entityKey = pickString(row, ["entity_key", "entityKey"]);
      if (!entityKey) {
        return acc;
      }
      (acc[entityKey] ||= []).push(mapDailyPoint(row));
      return acc;
    }, {});

    const sources = overviewRows.map((row) => {
      const entityKey = pickString(row, ["entity_key", "entityKey"]) || "unknown-source";
      return mapRow(row, dailyBySource[entityKey] || []);
    });

    return NextResponse.json<GrowthResponse>({
      sources,
      summary: {
        tracked: sources.length,
        fresh: sources.filter((source) => source.freshness === "fresh").length,
        stale: sources.filter((source) => source.freshness === "stale").length,
        expired: sources.filter((source) => source.freshness === "expired").length,
        totalMembers: sumNullable(sources.map((source) => source.current.members)),
        totalSubscribers: sumNullable(
          sources.map((source) => {
            const free = source.current.freeSubscribers || 0;
            const paid = source.current.paidSubscribers || 0;
            return free || paid ? free + paid : null;
          })
        ),
        totalPaidSubscribers: sumNullable(sources.map((source) => source.current.paidSubscribers)),
        totalMRR: sumNullable(sources.map((source) => source.current.mrr)),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<GrowthResponse>(
      {
        sources: [],
        summary: {
          tracked: 0,
          fresh: 0,
          stale: 0,
          expired: 0,
          totalMembers: null,
          totalSubscribers: null,
          totalPaidSubscribers: null,
          totalMRR: null,
        },
        error: `Failed to fetch growth data: ${String(error)}`,
        fetchedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
