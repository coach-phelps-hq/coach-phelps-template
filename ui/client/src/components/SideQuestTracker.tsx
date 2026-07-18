/**
 * SideQuestTracker — Progress bars for each side quest from the 60-day challenge.
 * Athlete OS: hard borders, monospace numbers, solid fill bars.
 * v3: All data driven by challenge_v2.json — zero hardcoded targets.
 * Quest rendering based on type + polarity:
 *   - default_done:     completed = eligible - missed - excused
 *   - default_not_done: completed = completed_dates.length
 *   - progress:         show current/target
 */
import {
  Activity,
  getTrainingCategory,
  computeFoundationStreak,
  totalCalories,
  parseLocal,
} from "@/lib/activities";
import type { ChallengeV2, ChallengeMetadata, MainQuest, Quest } from "@/lib/challenge";

interface Props {
  activities: Activity[];
  challengeData: ChallengeV2;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAL_TARGET = 12000;

function daysSince(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 0); // +1 to include start day
}

const QUEST_COLORS: Record<string, string> = {
  cold_shower:  "#2dd4bf",
  "6am_wakeup": "#ef4444",
  protein:      "#f59e0b",
  sleep:        "#a78bfa",
};

function getQuestColor(id: string): string {
  return QUEST_COLORS[id] ?? "#94a3b8";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{current}/{target}</span>
      </div>
      <div className="h-2 bg-muted overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MainQuestCard({ activities, challenge, mainQuest }: { activities: Activity[]; challenge: ChallengeMetadata; mainQuest: MainQuest }) {
  const target = mainQuest.target;
  const pattern = mainQuest.count_pattern ? new RegExp(mainQuest.count_pattern, "i") : null;
  const completed = activities.filter((a) => {
    if (a.start_date_local.slice(0, 10) < challenge.start_date) return false;
    // Match by name pattern if defined, otherwise fall back to run category
    if (pattern) return pattern.test(a.name);
    return getTrainingCategory(a) === "run";
  }).length;
  const pct = Math.min((completed / target) * 100, 100);

  // Day tracking
  const start = new Date(challenge.start_date);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const dayNum = Math.max(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 1);
  const totalDays = challenge.duration_days;

  // Pace: expected sessions by now
  const expectedByNow = (dayNum / totalDays) * target;
  const paceStatus = completed >= expectedByNow ? "ahead" : completed >= expectedByNow - 1 ? "on track" : "behind";
  const paceColor = paceStatus === "behind" ? "#FF4D00" : "#22c55e";

  return (
    <div className="mb-6">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Main Quest
      </h2>
      <div className="text-xs font-bold uppercase tracking-wide mb-2">
        {mainQuest.name}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-mono font-black leading-none">
          {completed}<span className="text-sm font-normal text-muted-foreground">/{target}</span>
        </span>
      </div>
      <div className="h-3 bg-muted overflow-hidden">
        <div
          className="h-full transition-all duration-500 bg-foreground"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 text-[10px] font-mono" style={{ color: paceColor }}>
        {paceStatus}
      </div>
    </div>
  );
}

// ─── Quest computation ────────────────────────────────────────────────────────

function computeQuestProgress(quest: Quest): { current: number; target: number } {
  if (quest.type === "progress") {
    return {
      current: quest.current ?? 0,
      target: quest.target ?? 1,
    };
  }

  // daily_streak
  const eligible = daysSince(quest.start_date);

  if (quest.polarity === "default_done") {
    // completed = eligible - missed - excused
    // (excused days are neutral: not completed, not failed)
    const missed = quest.missed_dates?.length ?? 0;
    const excused = quest.excused_dates?.length ?? 0;
    return { current: eligible - missed - excused, target: eligible };
  }

  if (quest.polarity === "default_not_done") {
    // completed = completed_dates.length
    const completed = quest.completed_dates?.length ?? 0;
    return { current: completed, target: eligible };
  }

  // Fallback
  return { current: 0, target: eligible };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SideQuestTracker({ activities, challengeData }: Props) {
  const { challenge, main_quest, quests } = challengeData;

  // Build quest bars from challenge_v2 quests array
  const questBars = quests.map((q) => {
    const { current, target } = computeQuestProgress(q);
    return {
      label: q.name,
      current,
      target,
      color: getQuestColor(q.id),
    };
  });

  // Foundation streak (for display at bottom)
  const foundationQuest = quests.find((q) => q.id === "foundation");
  const foundationStreak = computeFoundationStreak(
    activities,
    foundationQuest?.excused_dates ?? [],
  );

  // Monthly Calories
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthActivities = activities.filter((a) => {
    const d = parseLocal(a.start_date_local);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const burned = totalCalories(monthActivities);
  const calPct = Math.min(burned / CAL_TARGET, 1);
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const expectedPacePct = currentDay / daysInMonth;
  const onTrack = calPct >= expectedPacePct;
  const daysLeft = daysInMonth - currentDay;
  const remaining = Math.max(CAL_TARGET - burned, 0);
  const neededPerDay = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const monthName = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const fillColor = onTrack ? "#22c55e" : "#FF4D00";

  return (
    <div className="py-6">
      {/* Calorie Burn Bar */}
      <div className="mb-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Calories — {monthName}
        </h2>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-mono font-black leading-none">
            {burned >= 1000 ? `${(burned / 1000).toFixed(1)}K` : burned}
          </span>
          <span className="text-xs text-muted-foreground font-mono">/ {CAL_TARGET / 1000}K</span>
        </div>
        <div className="relative h-3 bg-muted overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${calPct * 100}%`, backgroundColor: fillColor }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/60"
            style={{ left: `${expectedPacePct * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono" style={{ color: fillColor }}>
            {onTrack ? "On track" : `${neededPerDay}/day needed`}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {daysLeft}d left
          </span>
        </div>
      </div>

      <div className="border-b border-foreground/20 mb-6" />

      <MainQuestCard activities={activities} challenge={challenge} mainQuest={main_quest} />

      <div className="border-b border-foreground/20 mb-6" />

      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Side Quests
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
        {questBars.map((q) => (
          <QuestBar key={q.label} {...q} />
        ))}
      </div>
      {foundationStreak > 0 && (
        <div className="mt-4 text-[10px] text-muted-foreground">
          Current streak: <span className="font-mono font-bold text-foreground">{foundationStreak}d</span> Foundation
        </div>
      )}
    </div>
  );
}
