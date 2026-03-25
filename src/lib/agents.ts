/**
 * Agent registry — maps agent IDs to display names and their OpenRouter env key
 */

export interface AgentDef {
  id: string;
  name: string;
  venture: "PE" | "G2L" | "Pidgeon" | "Shared";
  envKey: string; // env var name for OpenRouter key
  emoji: string;
}

export const AGENTS: AgentDef[] = [
  { id: "dahlia", name: "Dahlia", venture: "Shared", envKey: "OPENROUTER_KEY_DAHLIA", emoji: "🌸" },
  { id: "cyrus-pe", name: "Cyrus PE", venture: "PE", envKey: "OPENROUTER_KEY_CYRUS_PE", emoji: "🦅" },
  { id: "cyrus-g2l", name: "Cyrus G2L", venture: "G2L", envKey: "OPENROUTER_KEY_CYRUS_G2L", emoji: "🦅" },
  { id: "cyrus-pidgeon", name: "Cyrus Pidgeon", venture: "Pidgeon", envKey: "OPENROUTER_KEY_CYRUS_PIDGEON", emoji: "🦅" },
  { id: "echo-pe", name: "Echo PE", venture: "PE", envKey: "OPENROUTER_KEY_ECHO_PE", emoji: "🔊" },
  { id: "echo-g2l", name: "Echo G2L", venture: "G2L", envKey: "OPENROUTER_KEY_ECHO_G2L", emoji: "🔊" },
  { id: "echo-pidgeon", name: "Echo Pidgeon", venture: "Pidgeon", envKey: "OPENROUTER_KEY_ECHO_PIDGEON", emoji: "🔊" },
  { id: "enzo", name: "Enzo", venture: "Shared", envKey: "OPENROUTER_KEY_ENZO", emoji: "🧘" },
  { id: "default", name: "Shared Key", venture: "Shared", envKey: "OPENROUTER_API_KEY", emoji: "🔑" },
];

export interface AgentSpend {
  id: string;
  name: string;
  venture: string;
  emoji: string;
  daily: number;
  weekly: number;
  monthly: number;
  limit: number | null;
  limitRemaining: number | null;
  limitReset: string | null;
  usagePercent: number; // 0-100
  status: "ok" | "warning" | "critical" | "error";
}
