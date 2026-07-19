/**
 * WeeklySummaryCards — 4 category-specific cards showing this week's training.
 * Full Send Season: Calisthenics / Badminton / Swim / Run
 * Targets read from challenge_v2.json — zero hardcoded values.
 */
import {
  Activity,
  getTrainingCategory,
  getThisWeekActivities,
  parseLocal,
  GROUP_CONFIG,
} from "@/lib/activities";
import type { WeeklyTargets } from "@/lib/challenge";
// import type { Quest } from "@/lib/challenge"; — re-add when FoundationCard is active
// import { toLocalDateStr } from "@/lib/challenge"; — re-add when FoundationCard is active

interface Props {
  activities: Activity[];
  weeklyTargets: WeeklyTargets;
  // quests: Quest[]; — re-add when FoundationCard is active (needs foundation quest data)
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getDayOfWeek(dateStr: string): number {
  const d = parseLocal(dateStr);
  return (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
}

function DayDots({ activeDays, color }: { activeDays: Set<number>; color: string }) {
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7;

  return (
    <div className="flex gap-1 mt-3">
      {WEEKDAY_LABELS.map((label, i) => {
        const done = activeDays.has(i);
        const isFuture = i > todayDow;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold"
              style={{
                backgroundColor: done ? color : "transparent",
                color: done ? "#fff" : isFuture ? "#ccc" : "#999",
                border: done ? "none" : `1.5px solid ${isFuture ? "#ddd" : "#bbb"}`,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="h-2 bg-muted mt-2 overflow-hidden">
      <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-2 border-foreground p-4">
      {children}
    </div>
  );
}

// ─── Inactive Cards (Full Send Season) ────────────────────────────────────────
// These cards were active in the Strength Season. Commented out, not deleted.
// To reactivate: add the card back to WeeklySummaryCards, add the matching key
// to WeeklyTargets in challenge.ts, and add it to challenge_v2.json weekly_targets.

// FoundationCard — driven by the foundation daily_streak quest (default_done polarity).
// Used when the weekly spine includes a daily morning foundation session.
// Requires: quests prop on WeeklySummaryCards, and a quest with id "foundation" in challenge_v2.json.
/*
function FoundationCard({ quest, target }: { quest: Quest | undefined; target: number }) {
  const config = GROUP_CONFIG.foundation;
  const monday = getThisWeekMonday();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;
  const activeDays = new Set<number>();

  if (quest) {
    const qStart = new Date(quest.start_date + "T00:00:00");
    const effectiveStart = qStart > monday ? qStart : monday;
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const effectiveEnd = today < sunday ? today : sunday;

    const missed = new Set(quest.missed_dates ?? []);
    const excused = new Set(quest.excused_dates ?? []);
    const allMissed = new Set([...missed, ...excused]);

    const d = new Date(effectiveStart);
    while (d <= effectiveEnd) {
      const ds = toLocalDateStr(d);
      const dow = (d.getDay() + 6) % 7;
      if (!allMissed.has(ds)) {
        count++;
        activeDays.add(dow);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      <DayDots activeDays={activeDays} color={config.color} />
    </SummaryCard>
  );
}
*/

// StrengthCard — counts Strava activities classified as "strength" or "weight_training".
// Used when the weekly spine includes dedicated strength sessions (Strength A / Strength B).
// Requires: "strength" key in WeeklyTargets and challenge_v2.json weekly_targets.
/*
function StrengthCard({ activities, target }: { activities: Activity[]; target: number }) {
  const config = GROUP_CONFIG.strength;
  const thisWeek = getThisWeekActivities(activities);
  const sessions = thisWeek.filter((a) => {
    const cat = getTrainingCategory(a);
    return cat === "strength" || cat === "weight_training";
  });
  const activeDays = new Set(sessions.map((a) => getDayOfWeek(a.start_date_local)));
  const count = sessions.length;

  const labels = sessions.map((a) => {
    const match = a.name.match(/Strength\s+(A|B)/i);
    return match ? `Strength ${match[1]}` : a.name;
  });

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      {labels.length > 0 ? (
        <div className="mt-3 space-y-1">
          {labels.map((l, i) => (
            <div key={i} className="text-[10px] font-mono text-muted-foreground">
              <span style={{ color: config.color }}>&#10003;</span> {l}
            </div>
          ))}
        </div>
      ) : (
        <DayDots activeDays={activeDays} color={config.color} />
      )}
    </SummaryCard>
  );
}
*/

// ─── Active Cards (Full Send Season) ──────────────────────────────────────────
// Re-add getThisWeekMonday() here when FoundationCard is active.

function CalisthenicsCard({ activities, target }: { activities: Activity[]; target: number }) {
  const config = GROUP_CONFIG.calisthenics;
  const thisWeek = getThisWeekActivities(activities);
  const sessions = thisWeek.filter((a) => getTrainingCategory(a) === "calisthenics");
  const activeDays = new Set(sessions.map((a) => getDayOfWeek(a.start_date_local)));
  const count = sessions.length;

  const labels = sessions.map((a) => {
    const match = a.name.match(/Calisthenics #\d+:\s*(.+)/i);
    return match ? match[1] : a.name;
  });

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      {labels.length > 0 ? (
        <div className="mt-3 space-y-1">
          {labels.map((l, i) => (
            <div key={i} className="text-[10px] font-mono text-muted-foreground">
              <span style={{ color: config.color }}>&#10003;</span> {l}
            </div>
          ))}
        </div>
      ) : (
        <DayDots activeDays={activeDays} color={config.color} />
      )}
    </SummaryCard>
  );
}

function BadmintonCard({ activities, target }: { activities: Activity[]; target: number }) {
  const config = GROUP_CONFIG.badminton;
  const thisWeek = getThisWeekActivities(activities);
  const sessions = thisWeek.filter((a) => {
    const cat = getTrainingCategory(a);
    return cat === "badminton_ranked" || cat === "badminton_league" || cat === "badminton_friendly" || cat === "badminton_casual";
  });
  const activeDays = new Set(sessions.map((a) => getDayOfWeek(a.start_date_local)));
  const count = sessions.length;

  const labels = sessions.map((a) => {
    const match = a.name.match(/Badminton:\s*(.+)/i);
    return match ? match[1] : a.name;
  });

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      {labels.length > 0 ? (
        <div className="mt-3 space-y-1">
          {labels.map((l, i) => (
            <div key={i} className="text-[10px] font-mono text-muted-foreground">
              <span style={{ color: config.color }}>&#10003;</span> {l}
            </div>
          ))}
        </div>
      ) : (
        <DayDots activeDays={activeDays} color={config.color} />
      )}
    </SummaryCard>
  );
}

function RunCard({ activities, target }: { activities: Activity[]; target: number }) {
  const config = GROUP_CONFIG.run;
  const thisWeek = getThisWeekActivities(activities);
  const sessions = thisWeek.filter((a) => getTrainingCategory(a) === "run");
  const activeDays = new Set(sessions.map((a) => getDayOfWeek(a.start_date_local)));
  const count = sessions.length;

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      <DayDots activeDays={activeDays} color={config.color} />
    </SummaryCard>
  );
}

function SwimCard({ activities, target }: { activities: Activity[]; target: number }) {
  const config = GROUP_CONFIG.swim;
  const thisWeek = getThisWeekActivities(activities);
  const sessions = thisWeek.filter((a) => getTrainingCategory(a) === "swim");
  const activeDays = new Set(sessions.map((a) => getDayOfWeek(a.start_date_local)));
  const count = sessions.length;

  return (
    <SummaryCard>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {config.label}
      </h3>
      <div className="flex items-baseline gap-1">
        <span className="metric-lg">{count}</span>
        <span className="text-sm text-muted-foreground font-mono">/{target}</span>
      </div>
      <ProgressBar current={count} target={target} color={config.color} />
      <DayDots activeDays={activeDays} color={config.color} />
    </SummaryCard>
  );
}

export function WeeklySummaryCards({ activities, weeklyTargets }: Props) {
  return (
    <div className="container pt-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
        <CalisthenicsCard activities={activities} target={weeklyTargets.calisthenics} />
        <BadmintonCard activities={activities} target={weeklyTargets.badminton} />
        <RunCard activities={activities} target={weeklyTargets.run} />
        <SwimCard activities={activities} target={weeklyTargets.swim} />
      </div>
    </div>
  );
}
