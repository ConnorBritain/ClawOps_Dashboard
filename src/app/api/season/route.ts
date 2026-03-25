import { NextResponse } from "next/server";
import { getSeasonState } from "@/lib/seasons";

export const revalidate = 60; // revalidate every 60 seconds (season data changes slowly)

export async function GET() {
  const state = getSeasonState();

  return NextResponse.json({
    season: state.season,
    seasonYear: state.seasonYear,
    weekInSeason: state.weekInSeason,
    weekInYear: state.weekInYear,
    pattern: state.pattern,
    challenge: state.challenge,
    challengeWeekType: state.challengeWeekType,
    challengeNumber: state.challengeNumber,
    seasonProgress: state.seasonProgress,
    daysUntilNextSeason: state.daysUntilNextSeason,
    nextSeasonName: state.nextSeasonName,
    seasonStartDate: state.seasonStartDate.toISOString(),
    seasonEndDate: state.seasonEndDate.toISOString(),
  });
}
