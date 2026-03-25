import { NextResponse } from "next/server";
import { sortWorkItems, type WorkItem } from "@/lib/dashboard";

export const revalidate = 300; // 5 min cache

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({
      items: [],
      byAgent: {},
      byStatus: {},
      total: 0,
      error: "No Supabase credentials",
    });
  }

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/work_queue`);
    url.searchParams.set(
      "select",
      "id,title,assigned_to,status,priority,venture,description,created_at,updated_at"
    );
    url.searchParams.set("status", "not.in.(done,cancelled)");
    url.searchParams.set("order", "updated_at.desc");
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
        byAgent: {},
        byStatus: {},
        total: 0,
        error: `Supabase ${res.status}: ${text.substring(0, 200)}`,
      });
    }

    const rawItems: Array<{
      id: string;
      title: string;
      assigned_to: string;
      status: string;
      priority: string;
      venture: string;
      description: string;
      created_at: string;
      updated_at: string;
    }> = await res.json();

    const items = sortWorkItems(
      rawItems.map(
        (item): WorkItem => ({
          id: item.id,
          title: item.title,
          assignedTo: item.assigned_to || "unassigned",
          status: item.status,
          priority: item.priority,
          venture: item.venture,
          description: item.description?.substring(0, 200) || "",
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })
      )
    );

    // Group by agent
    const byAgent: Record<string, WorkItem[]> = {};
    for (const item of items) {
      const agent = item.assignedTo || "unassigned";
      if (!byAgent[agent]) byAgent[agent] = [];
      byAgent[agent].push(item);
    }

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    return NextResponse.json({
      items,
      byAgent,
      byStatus,
      total: items.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      items: [],
      byAgent: {},
      byStatus: {},
      total: 0,
      error: String(e),
    });
  }
}
