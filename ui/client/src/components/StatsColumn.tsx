/**
 * StatsColumn — Left column with oversized key metrics.
 * Athlete OS: large monospace numbers, hard dividers, no decoration.
 */
import {
  Activity,
  getThisWeekActivities,
  getLastWeekActivities,
  totalTime,
  totalCalories,
  avgHr,
  formatDurationShort,
  getSportConfig,
  getSportGroup,
  parseLocal,
} from "@/lib/activities";

interface Props {
  activities: Activity[];
  filteredActivities: Activity[];
}

export function StatsColumn({ activities, filteredActivities }: Props) {
  const thisWeek = getThisWeekActivities(activities);
  const lastWeek = getLastWeekActivities(activities);

  const thisWeekTime = totalTime(thisWeek);
  const lastWeekTime = totalTime(lastWeek);
  const timeDiff = thisWeekTime - lastWeekTime;

  const thisWeekCals = totalCalories(thisWeek);
  const thisWeekHr = avgHr(thisWeek);

  // 2026 So Far
  const year2026 = activities.filter((a) => parseLocal(a.start_date_local) >= new Date("2026-01-01"));
  const year2026Time = totalTime(year2026);
  const year2026Cals = totalCalories(year2026);
  const year2026Hr = avgHr(year2026);

  // Sport breakdown — grouped into core types + Others
  const sportCounts = new Map<string, number>();
  for (const a of activities) {
    const group = getSportGroup(a.sport_type);
    sportCounts.set(group, (sportCounts.get(group) || 0) + 1);
  }
  const sportStats = Array.from(sportCounts.entries())
    .map(([sport, count]) => ({
      sport,
      count,
      config: getSportConfig(sport),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-0">
      {/* This Week */}
      <div className="pb-6 border-b-2 border-foreground">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
          This Week
        </h2>
        <div className="metric-xl">{thisWeek.length}</div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          Sessions
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Time</span>
            <span className="metric-sm">{formatDurationShort(thisWeekTime)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Calories</span>
            <span className="metric-sm">{Math.round(thisWeekCals)}</span>
          </div>
          {thisWeekHr && (
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Avg HR</span>
              <span className="metric-sm">{thisWeekHr} bpm</span>
            </div>
          )}
        </div>
        {timeDiff !== 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {timeDiff > 0 ? "+" : ""}{formatDurationShort(Math.abs(timeDiff))} vs last week
          </div>
        )}
      </div>

      {/* 2026 So Far */}
      <div className="py-6 border-b-2 border-foreground">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
          2026 So Far
        </h2>
        <div className="metric-lg">{year2026.length}</div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
          Activities
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Time</span>
            <span className="metric-sm">{formatDurationShort(year2026Time)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Calories</span>
            <span className="metric-sm">{Math.round(year2026Cals).toLocaleString()}</span>
          </div>
          {year2026Hr && (
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Avg HR</span>
              <span className="metric-sm">{year2026Hr} bpm</span>
            </div>
          )}
        </div>
      </div>

      {/* Sport Breakdown */}
      <div className="py-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
          By Sport
        </h2>
        <div className="space-y-3">
          {sportStats.map(({ sport, count, config }) => (
            <div key={sport} className="flex items-center gap-3">
              <div
                className="w-3 h-3 shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <div className="flex-1 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {config.label}
                </span>
                <span className="metric-sm">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
