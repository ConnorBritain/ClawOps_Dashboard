import { NextResponse } from "next/server";
import { getCentralWeekStart } from "@/lib/time";

export const revalidate = 900; // 15 min cache

const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/public/v1";
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;

interface PostizPost {
  id: string;
  content: string;
  status: string;
  scheduledDate: string | null;
  integration?: { name?: string };
}

export async function GET() {
  if (!POSTIZ_API_KEY) {
    return NextResponse.json({ posts: [], total: 0, error: "No API key" });
  }

  try {
    // Postiz requires startDate and endDate
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
    const res = await fetch(`${POSTIZ_API_URL}/posts?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        Authorization: POSTIZ_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      return NextResponse.json({
        posts: [],
        total: 0,
        error: `Postiz API ${res.status}`,
      });
    }

    const data = await res.json();
    const posts: PostizPost[] = Array.isArray(data) ? data : [];

    const monday = getCentralWeekStart();
    const nextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const scheduledThisWeek = posts.filter((post) => {
      if (!post.scheduledDate || post.status !== "SCHEDULED") {
        return false;
      }

      const date = new Date(post.scheduledDate);
      return date >= monday && date < nextMonday;
    });

    const publishedThisWeek = posts.filter((post) => {
      if (!post.scheduledDate || post.status !== "PUBLISHED") {
        return false;
      }

      const date = new Date(post.scheduledDate);
      return date >= monday && date < nextMonday;
    });

    const nextScheduled = [...scheduledThisWeek]
      .sort(
        (left, right) =>
          new Date(left.scheduledDate || 0).getTime() -
          new Date(right.scheduledDate || 0).getTime()
      )[0] || null;

    return NextResponse.json({
      posts: posts.slice(0, 10).map((p) => ({
        id: p.id,
        content: p.content?.substring(0, 120) || "",
        status: p.status,
        scheduledDate: p.scheduledDate,
        channel: p.integration?.name || "Unknown",
      })),
      summary: {
        scheduledThisWeek: scheduledThisWeek.length,
        publishedThisWeek: publishedThisWeek.length,
        draftCount: posts.filter((post) => post.status === "DRAFT").length,
        nextScheduled: nextScheduled
          ? {
              scheduledDate: nextScheduled.scheduledDate || "",
              channel: nextScheduled.integration?.name || "Unknown",
              status: nextScheduled.status,
            }
          : null,
      },
      counts: {
        scheduled: posts.filter((post) => post.status === "SCHEDULED").length,
        published: posts.filter((post) => post.status === "PUBLISHED").length,
        draft: posts.filter((post) => post.status === "DRAFT").length,
        thisWeek: scheduledThisWeek.length,
      },
      total: posts.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({
      posts: [],
      total: 0,
      error: String(e),
    });
  }
}
