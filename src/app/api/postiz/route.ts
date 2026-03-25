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
    const res = await fetch(`${POSTIZ_API_URL}/posts?limit=20`, {
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

    // Count by status
    const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;
    const published = posts.filter((p) => p.status === "PUBLISHED").length;
    const draft = posts.filter((p) => p.status === "DRAFT").length;

    // This week's posts
    const monday = getCentralWeekStart();

    const thisWeekPosts = posts.filter((p) => {
      if (!p.scheduledDate) return false;
      return new Date(p.scheduledDate) >= monday;
    });

    return NextResponse.json({
      posts: posts.slice(0, 10).map((p) => ({
        id: p.id,
        content: p.content?.substring(0, 120) || "",
        status: p.status,
        scheduledDate: p.scheduledDate,
        channel: p.integration?.name || "Unknown",
      })),
      counts: {
        scheduled,
        published,
        draft,
        thisWeek: thisWeekPosts.length,
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
