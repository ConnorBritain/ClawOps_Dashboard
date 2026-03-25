import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min cache

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

async function supabaseQuery(path: string, params: Record<string, string> = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
    },
    next: { revalidate: 300 },
  });

  const count = res.headers.get("content-range");
  const data = await res.json();
  return { data, count };
}

export async function GET() {
  try {
    // Total thought count
    const total = await supabaseQuery("thoughts", {
      select: "id",
      limit: "1",
    });

    // Thoughts this week (since Monday 00:00 CT)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const thisWeek = await supabaseQuery("thoughts", {
      select: "id",
      "created_at": `gte.${monday.toISOString()}`,
      limit: "1",
    });

    // Recent thoughts (last 10)
    const recent = await supabaseQuery("thoughts", {
      select: "id,raw_text,source,created_at,thought_type",
      order: "created_at.desc",
      limit: "10",
    });

    // Parse count from content-range header (e.g., "0-0/847")
    const totalCount = total?.count
      ? parseInt(total.count.split("/")[1] || "0")
      : 0;
    const weekCount = thisWeek?.count
      ? parseInt(thisWeek.count.split("/")[1] || "0")
      : 0;

    return NextResponse.json({
      totalThoughts: totalCount,
      thisWeekThoughts: weekCount,
      recent: (recent?.data || []).map((t: Record<string, unknown>) => ({
        id: t.id,
        text: typeof t.raw_text === "string" ? t.raw_text.substring(0, 200) : "",
        source: t.source,
        type: t.thought_type,
        createdAt: t.created_at,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch Beacon data", detail: String(e) },
      { status: 500 }
    );
  }
}
