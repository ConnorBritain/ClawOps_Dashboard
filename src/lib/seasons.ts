/**
 * Pattern Engine Seasonal System
 *
 * 4 seasons × 13 weeks = 52-week annual cycle
 * Each season maps to a quarter, each week to a Pattern Card.
 * G2L Challenge Labs run biweekly (7 per season).
 */

// Season 1 starts April 1, 2026 (both PE and G2L)
const YEAR_ONE_START = new Date("2026-04-01T00:00:00-05:00"); // CDT

export interface Season {
  number: number; // 1-4
  name: string;
  theme: string;
  description: string;
  color: string; // hex accent
}

export interface PatternCard {
  week: number; // 1-13
  name: string;
  description: string;
}

export interface ChallengeLabDef {
  number: number; // 1-7
  weeks: string; // "W1-2"
  name: string;
  patterns: string; // "Attention + Habit"
  humanQuestion: string;
  practicalBuild: string;
}

export const SEASONS: Season[] = [
  {
    number: 1,
    name: "Signal",
    theme: "Patterns of attention, meaning, perception, formation",
    description:
      "Start with YOU. How do you see? What do you notice? What shapes you?",
    color: "#FF7D45",
  },
  {
    number: 2,
    name: "Systems",
    theme: "Patterns of workflow, teams, incentives, governance",
    description:
      "Expand to your ENVIRONMENT. How do structures shape behavior?",
    color: "#4ADE80",
  },
  {
    number: 3,
    name: "Machines",
    theme: "Patterns of AI: context, retrieval, evals, automation, agency",
    description: "Now look at the TOOLS. What are these machines doing?",
    color: "#60A5FA",
  },
  {
    number: 4,
    name: "Stewardship",
    theme: "Patterns of ethics, power, dependency, embodiment",
    description:
      "Return to RESPONSIBILITY. How do you govern them wisely?",
    color: "#DC97FF",
  },
];

export const SIGNAL_PATTERNS: PatternCard[] = [
  { week: 1, name: "Attention", description: "What you attend to grows. What AI attends to is trained. Neither is neutral." },
  { week: 2, name: "Habit", description: "The invisible architecture of your day. AI automates habits — but whose?" },
  { week: 3, name: "Narrative", description: "The stories we tell about ourselves shape what we build." },
  { week: 4, name: "Trust", description: "Earned vs assumed. What happens when 'the model said so' replaces 'I thought about it'?" },
  { week: 5, name: "Authority", description: "Who do you listen to? What happens when the authority is a machine?" },
  { week: 6, name: "Memory", description: "What's worth remembering? Context windows and human storytelling share more than you think." },
  { week: 7, name: "Anxiety", description: "The signal underneath the noise. What your resistance is trying to tell you." },
  { week: 8, name: "Identity", description: "Who are you becoming? Technology doesn't just change what you do — it changes who you are." },
  { week: 9, name: "Speed", description: "Faster isn't always better. When does velocity become violence?" },
  { week: 10, name: "Comparison", description: "The quiet thief. Benchmarks, leaderboards, and the human cost of optimization." },
  { week: 11, name: "Avoidance", description: "What are you not looking at? The patterns we refuse to name are the ones running us." },
  { week: 12, name: "Presence", description: "The opposite of automation. What does it mean to be HERE in an age of everywhere?" },
  { week: 13, name: "Wisdom", description: "The capstone. Not intelligence, not knowledge. Wisdom." },
];

// Pattern maps per season — Season 1 is fully defined, others are placeholders
// that will be populated as we get into those seasons
export const SEASON_PATTERNS: Record<number, PatternCard[]> = {
  1: SIGNAL_PATTERNS,
  2: Array.from({ length: 13 }, (_, i) => ({
    week: i + 1,
    name: `Systems Pattern ${i + 1}`,
    description: "To be defined",
  })),
  3: Array.from({ length: 13 }, (_, i) => ({
    week: i + 1,
    name: `Machines Pattern ${i + 1}`,
    description: "To be defined",
  })),
  4: Array.from({ length: 13 }, (_, i) => ({
    week: i + 1,
    name: `Stewardship Pattern ${i + 1}`,
    description: "To be defined",
  })),
};

export const SIGNAL_CHALLENGES: ChallengeLabDef[] = [
  {
    number: 1,
    weeks: "W1-2",
    name: "Focus Architecture",
    patterns: "Attention + Habit",
    humanQuestion: "What deserves your attention? What invisible habits govern your day?",
    practicalBuild: "Design a personal attention/habit system using AI",
  },
  {
    number: 2,
    weeks: "W3-4",
    name: "Voice & Trust",
    patterns: "Narrative + Trust",
    humanQuestion: "How do you tell your story? Who do you trust to tell it for you?",
    practicalBuild: "Build a prompt library that captures your authentic voice",
  },
  {
    number: 3,
    weeks: "W5-6",
    name: "Memory Architecture",
    patterns: "Authority + Memory",
    humanQuestion: "What's worth remembering? When does 'the model said so' replace your own knowing?",
    practicalBuild: "Set up a personal knowledge graph (Beacon/OpenBrain)",
  },
  {
    number: 4,
    weeks: "W7-8",
    name: "Digital Twin Identity",
    patterns: "Anxiety + Identity",
    humanQuestion: "Who are you becoming in the age of AI? What do you want to amplify?",
    practicalBuild: "Build a digital twin that represents you faithfully",
  },
  {
    number: 5,
    weeks: "W9-10",
    name: "Information Diet",
    patterns: "Speed + Comparison",
    humanQuestion: "What are you consuming? How does velocity shape your view?",
    practicalBuild: "Create an AI-curated pipeline that filters signal from noise",
  },
  {
    number: 6,
    weeks: "W11-12",
    name: "Pattern Recognition",
    patterns: "Avoidance + Presence",
    humanQuestion: "What patterns run your life that you haven't named?",
    practicalBuild: "Train AI to identify patterns in your own data",
  },
  {
    number: 7,
    weeks: "W13",
    name: "Capstone: Your Signal Stack",
    patterns: "Wisdom",
    humanQuestion: "What have you learned about yourself? Can you articulate it?",
    practicalBuild: "Document your personal AI toolkit + the wisdom behind each choice",
  },
];

export const SEASON_CHALLENGES: Record<number, ChallengeLabDef[]> = {
  1: SIGNAL_CHALLENGES,
  // Placeholders for future seasons
  2: [],
  3: [],
  4: [],
};

// ─── Computed State ──────────────────────────────────────────

export interface SeasonState {
  // Season info
  season: Season;
  seasonYear: number; // which annual cycle (1, 2, ...)
  weekInSeason: number; // 1-13
  weekInYear: number; // 1-52

  // Pattern Card
  pattern: PatternCard;

  // G2L Challenge Lab
  challenge: ChallengeLabDef | null;
  challengeWeekType: "challenge" | "open"; // odd = challenge, even = open
  challengeNumber: number; // which challenge (1-7)

  // Progress
  seasonProgress: number; // 0-1
  daysUntilNextSeason: number;
  nextSeasonName: string;
  seasonStartDate: Date;
  seasonEndDate: Date;
}

export function getSeasonState(now: Date = new Date()): SeasonState {
  const startMs = YEAR_ONE_START.getTime();
  const nowMs = now.getTime();

  // Total days since Year 1 start
  const totalDays = Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24));

  // Each season = 13 weeks = 91 days
  const SEASON_DAYS = 91;
  const YEAR_DAYS = SEASON_DAYS * 4; // 364 days

  // Handle dates before Year 1 — show countdown to launch
  if (totalDays < 0) {
    return getPreLaunchState(now);
  }

  // Which year cycle and day within the year
  const yearCycle = Math.floor(totalDays / YEAR_DAYS) + 1;
  const dayInYear = totalDays % YEAR_DAYS;

  // Which season (0-3) and day within season
  const seasonIndex = Math.floor(dayInYear / SEASON_DAYS);
  const dayInSeason = dayInYear % SEASON_DAYS;

  // Which week within season (1-13)
  const weekInSeason = Math.floor(dayInSeason / 7) + 1;
  const clampedWeek = Math.min(weekInSeason, 13);

  // Overall week in year (1-52)
  const weekInYear = seasonIndex * 13 + clampedWeek;

  const season = SEASONS[seasonIndex];
  const patterns = SEASON_PATTERNS[season.number];
  const pattern = patterns[clampedWeek - 1];

  // Challenge lab mapping: biweekly, 7 per season
  // W1-2 = challenge 1, W3-4 = challenge 2, ... W13 = challenge 7
  const challengeNumber = Math.min(Math.ceil(clampedWeek / 2), 7);
  const challengeWeekType: "challenge" | "open" =
    clampedWeek % 2 === 1 || clampedWeek === 13 ? "challenge" : "open";

  const challenges = SEASON_CHALLENGES[season.number];
  const challenge = challenges.length > 0 ? challenges[challengeNumber - 1] || null : null;

  // Progress through season (0-1)
  const seasonProgress = dayInSeason / SEASON_DAYS;

  // Season start/end dates
  const seasonStartMs =
    startMs + (yearCycle - 1) * YEAR_DAYS * 86400000 + seasonIndex * SEASON_DAYS * 86400000;
  const seasonEndMs = seasonStartMs + SEASON_DAYS * 86400000;
  const seasonStartDate = new Date(seasonStartMs);
  const seasonEndDate = new Date(seasonEndMs);

  // Days until next season
  const daysUntilNextSeason = Math.ceil((seasonEndMs - nowMs) / 86400000);

  // Next season name
  const nextSeasonIndex = (seasonIndex + 1) % 4;
  const nextSeasonName = SEASONS[nextSeasonIndex].name;

  return {
    season,
    seasonYear: yearCycle,
    weekInSeason: clampedWeek,
    weekInYear,
    pattern,
    challenge,
    challengeWeekType,
    challengeNumber,
    seasonProgress,
    daysUntilNextSeason,
    nextSeasonName,
    seasonStartDate,
    seasonEndDate,
  };
}

function getPreLaunchState(now: Date): SeasonState {
  const daysUntilLaunch = Math.ceil(
    (YEAR_ONE_START.getTime() - now.getTime()) / 86400000
  );
  return {
    season: SEASONS[0],
    seasonYear: 1,
    weekInSeason: 0,
    weekInYear: 0,
    pattern: SIGNAL_PATTERNS[0],
    challenge: SIGNAL_CHALLENGES[0],
    challengeWeekType: "challenge",
    challengeNumber: 1,
    seasonProgress: 0,
    daysUntilNextSeason: daysUntilLaunch,
    nextSeasonName: "Signal",
    seasonStartDate: YEAR_ONE_START,
    seasonEndDate: new Date(YEAR_ONE_START.getTime() + 91 * 86400000),
  };
}
