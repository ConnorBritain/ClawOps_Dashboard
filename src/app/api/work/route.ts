import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min cache

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

interface WorkItem {
  id: string;
  title: string;
  assigned_to: string;
  status: string;
  priority: string;
  venture: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ items: [], error: "No Supabase credentials" });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/work_items`);
    url.searchParams.set("select", "id,title,assigned_to,status,priority,venture,description,created_at,updated_at");
    url.searchParams.set("status", "neq.done");
    url.searchParams.set("order", "priority.asc,created_at.desc");
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        items: [],
        error: `Supabase ${res.status}: ${text.substring(0, 200)}`,
      });
    }

    const items: WorkItem[] = await res.json();

    // Group by agent
    const byAgent: Record<string, WorkItem[]> = {};
    for (const item of items) {
      const agent = item.assigned_to || "unassigned";
      if (!byAgent[agent]) byAgent[agent] = [];
      byAgent[agent].push(item);
    }

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        assignedTo: i.assigned_to,
        status: i.status,
        priority: i.priority,
        venture: i.venture,
        description: i.description?.substring(0, 200) || "",
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      })),
      byAgent,
      byStatus,
      total: items.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      items: [],
      error: String(e),
    });
  }
}
