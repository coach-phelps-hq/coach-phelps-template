/**
 * Canonical types for challenge_v2.json.
 * Single source of truth — all components import from here.
 */

export interface ChallengeMetadata {
  name: string;
  start_date: string;
  duration_days: number;
  end_date: string;
}

export interface MainQuest {
  id: string;
  name: string;
  type: string;
  target: number;
  count_from: string;
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
  challenge: ChallengeMetadata;
  weekly_targets: WeeklyTargets;
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
