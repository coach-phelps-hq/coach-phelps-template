/**
 * Canonical types for challenge_v2.json.
 * Single source of truth — all components import from here.
 */

export interface ChallengeMetadata {
  name: string;
  start_date: string;
  // Optional - not every repo's build pipeline derives this (it's computable from
  // start_date/end_date when absent). See sibling-shipyard/coach-phelps-hq's
  // reconciliation of Akash's season/phase model, which has no single fixed duration.
  duration_days?: number;
  end_date: string;
}

export interface MainQuest {
  id: string;
  name: string;
  type: string;
  // Optional - some coaching models (e.g. a weekly-session-floor system) have no single
  // count-target concept. Components must guard on presence rather than assume it's set.
  target?: number;
  count_from?: string;
  count_pattern?: string;
  unit_label?: string;
  event_date?: string;
  notes?: string;
}

export interface Quest {
  id: string;
  name: string;
  type: "daily_streak" | "progress";
  category: string;
  start_date: string;
  end_date?: string;
  status: string;
  polarity?: "default_done" | "default_not_done";
  tracking: string;
  missed_dates?: string[];
  excused_dates?: string[];
  completed_dates?: string[];
  current?: number;
  target?: number;
  unit?: string;
  notes?: string;
}

export interface WeeklyTargets {
  calisthenics: number;
  badminton: number;
  swim: number;
  run: number;
}

export interface ChallengeV2 {
  version: number;
  // Optional - some repos' coaching model has no single "the challenge" concept
  // (e.g. a season/phase/block progression instead). Components must guard on its
  // presence rather than assume it's always there.
  challenge?: ChallengeMetadata;
  // Optional - not every coaching model uses a weekly-quota system.
  weekly_targets?: WeeklyTargets;
  main_quest: MainQuest;
  quests: Quest[];
}

/** Format a Date as YYYY-MM-DD in local time (avoids UTC drift from toISOString). */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
