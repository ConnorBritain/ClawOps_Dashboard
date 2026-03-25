import { NextResponse } from "next/server";
import { type ContentPipelineItem } from "@/lib/dashboard";

export const revalidate = 300;

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

interface RawContentPipelineItem {
  id: string;
  title: string;
  type: ContentPipelineItem["type"];
  venture: string;
  status: ContentPipelineItem["status"];
  created_by: string | null;
  drive_link: string | null;
  postiz_id: string | null;
  beehiiv_id: string | null;
  platform: string | null;
  season: number | null;
  week: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapVenture(value: string): ContentPipelineItem["venture"] {
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
      items: [],
      error: "No Supabase credentials",
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/content_pipeline`);
    url.searchParams.set(
      "select",
      "id,title,type,venture,status,created_by,drive_link,postiz_id,beehiiv_id,platform,season,week,notes,created_at,updated_at"
    );
    url.searchParams.set("order", "updated_at.desc");
    url.searchParams.set("limit", "200");

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
        items: [],
        error: `Supabase ${response.status}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    const rows: RawContentPipelineItem[] = await response.json();
    const items: ContentPipelineItem[] = rows.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      venture: mapVenture(item.venture),
      status: item.status,
      createdBy: item.created_by,
      driveLink: item.drive_link,
      postizId: item.postiz_id,
      beehiivId: item.beehiiv_id,
      platform: item.platform,
      season: item.season,
      week: item.week,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: `Failed to fetch content pipeline: ${String(error)}`,
        fetchedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
