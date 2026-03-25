import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min

const SUPABASE_URL = process.env.BEACON_SUPABASE_URL;
const SUPABASE_KEY = process.env.BEACON_SUPABASE_SERVICE_ROLE_KEY;

interface ContentItem {
  label: string;
  type: "pattern-card" | "currents" | "challenge-lab" | "build-note";
  status: "not-started" | "drafted" | "reviewed" | "published";
  source: string;
  lastUpdate: string | null;
}

export async function GET() {
  // Search Beacon for content signals this week
  const contentItems: ContentItem[] = [];

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      // Get this week's Monday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);

      // Search for content-related thoughts
      const url = new URL(`${SUPABASE_URL}/rest/v1/thoughts`);
      url.searchParams.set("select", "id,raw_text,source,created_at,thought_type");
      url.searchParams.set("created_at", `gte.${monday.toISOString()}`);
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString(), {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 },
      });

      if (res.ok) {
        const thoughts = await res.json();

        // Scan for content signals
        const contentKeywords = {
          "pattern-card": ["pattern card", "pattern note", "weekly essay"],
          currents: ["currents", "newsletter", "beehiiv"],
          "challenge-lab": ["challenge lab", "challenge post", "skool post"],
          "build-note": ["build note", "build log"],
        };

        for (const [type, keywords] of Object.entries(contentKeywords)) {
          const matching = thoughts.filter((t: Record<string, string>) =>
            keywords.some((k) => t.raw_text?.toLowerCase().includes(k))
          );

          if (matching.length > 0) {
            const latest = matching[0];
            const text = (latest.raw_text || "").toLowerCase();

            let status: ContentItem["status"] = "not-started";
            if (text.includes("published") || text.includes("posted")) status = "published";
            else if (text.includes("reviewed") || text.includes("approved")) status = "reviewed";
            else if (text.includes("draft") || text.includes("uploaded")) status = "drafted";

            contentItems.push({
              label: type === "pattern-card" ? "Pattern Card" :
                     type === "currents" ? "Currents Newsletter" :
                     type === "challenge-lab" ? "Challenge Lab" :
                     "Build Note",
              type: type as ContentItem["type"],
              status,
              source: latest.source || "unknown",
              lastUpdate: latest.created_at,
            });
          }
        }
      }
    }

    // Ensure all content types have an entry (even if not-started)
    const types = ["pattern-card", "currents", "challenge-lab"] as const;
    const labels = { "pattern-card": "Pattern Card", currents: "Currents Newsletter", "challenge-lab": "Challenge Lab" };

    for (const type of types) {
      if (!contentItems.find((c) => c.type === type)) {
        contentItems.push({
          label: labels[type],
          type,
          status: "not-started",
          source: "",
          lastUpdate: null,
        });
      }
    }

    return NextResponse.json({
      items: contentItems,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch content status", detail: String(e) },
      { status: 500 }
    );
  }
}
