import { NextResponse } from "next/server";
import { AGENTS, type AgentSpend } from "@/lib/agents";

export const revalidate = 300; // 5 minute cache

async function fetchAgentSpend(envKey: string): Promise<{
  daily: number;
  weekly: number;
  monthly: number;
  limit: number | null;
  limitRemaining: number | null;
  limitReset: string | null;
} | null> {
  const apiKey = process.env[envKey];
  if (!apiKey) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const d = json.data;

    return {
      daily: d.usage_daily || 0,
      weekly: d.usage_weekly || 0,
      monthly: d.usage_monthly || 0,
      limit: d.limit || null,
      limitRemaining: d.limit_remaining || null,
      limitReset: d.limit_reset || null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const results: AgentSpend[] = await Promise.all(
    AGENTS.map(async (agent) => {
      const spend = await fetchAgentSpend(agent.envKey);

      if (!spend) {
        return {
          id: agent.id,
          name: agent.name,
          venture: agent.venture,
          emoji: agent.emoji,
          daily: 0,
          weekly: 0,
          monthly: 0,
          limit: null,
          limitRemaining: null,
          limitReset: null,
          usagePercent: 0,
          status: "error" as const,
        };
      }

      const usagePercent = spend.limit
        ? Math.round((spend.weekly / spend.limit) * 100)
        : 0;

      let status: "ok" | "warning" | "critical" = "ok";
      if (usagePercent >= 90) status = "critical";
      else if (usagePercent >= 80) status = "warning";

      return {
        id: agent.id,
        name: agent.name,
        venture: agent.venture,
        emoji: agent.emoji,
        ...spend,
        usagePercent,
        status,
      };
    })
  );

  // Totals
  const totalDaily = results.reduce((s, a) => s + a.daily, 0);
  const totalWeekly = results.reduce((s, a) => s + a.weekly, 0);
  const totalMonthly = results.reduce((s, a) => s + a.monthly, 0);

  return NextResponse.json({
    agents: results,
    totals: {
      daily: Math.round(totalDaily * 100) / 100,
      weekly: Math.round(totalWeekly * 100) / 100,
      monthly: Math.round(totalMonthly * 100) / 100,
    },
    fetchedAt: new Date().toISOString(),
  });
}
