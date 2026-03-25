import { NextResponse } from "next/server";
import { type SeasonMatrixSlot } from "@/lib/dashboard";

export const revalidate = 300;

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

interface RawSeasonMatrixSlot {
  slot_id: string;
  season: number;
  week: number;
  venture: string;
  content_type: SeasonMatrixSlot["contentType"];
  slot_key: string;
  planned_title: string | null;
  title: string | null;
  theme: string | null;
  template_group: string | null;
  required: boolean;
  target_count: number;
  platforms: string[] | null;
  sort_order: number;
  effective_status: SeasonMatrixSlot["status"];
  content_id: string | null;
  drive_link: string | null;
  canonical_url: string | null;
  owner_agent: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  content_updated_at: string | null;
}

function mapVenture(value: string): SeasonMatrixSlot["venture"] {
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

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({
      slots: [],
      error: "No Supabase credentials",
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/season_matrix_view`);
    url.searchParams.set(
      "select",
      "slot_id,season,week,venture,content_type,slot_key,planned_title,title,theme,template_group,required,target_count,platforms,sort_order,effective_status,content_id,drive_link,canonical_url,owner_agent,scheduled_at,published_at,content_updated_at"
    );
    url.searchParams.set("order", "season.asc,week.asc,venture.asc,sort_order.asc");
    url.searchParams.set("limit", "1000");

    const response = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({
        slots: [],
        error: `Supabase ${response.status}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    const rows: RawSeasonMatrixSlot[] = await response.json();
    const slots: SeasonMatrixSlot[] = rows.map((row) => ({
      slotId: row.slot_id,
      season: row.season,
      week: row.week,
      venture: mapVenture(row.venture),
      contentType: row.content_type,
      slotKey: row.slot_key,
      plannedTitle: row.planned_title,
      title: row.title,
      theme: row.theme,
      templateGroup: row.template_group,
      required: row.required,
      targetCount: row.target_count,
      platforms: row.platforms || [],
      sortOrder: row.sort_order,
      status: row.effective_status,
      contentId: row.content_id,
      driveLink: row.drive_link,
      canonicalUrl: row.canonical_url,
      ownerAgent: row.owner_agent,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      updatedAt: row.content_updated_at,
    }));

    return NextResponse.json({
      slots,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        slots: [],
        error: `Failed to fetch season matrix: ${String(error)}`,
        fetchedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
