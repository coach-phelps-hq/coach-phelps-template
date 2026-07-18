import { useMemo } from "react";
import {
  Activity,
  getTrainingCategory,
  CATEGORY_CONFIG,
  totalTime,
  totalCalories,
  parseLocal,
  daysElapsedInMonth,
  isCurrentMonth,
} from "@/lib/activities";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  activities: Activity[];
  prevActivities: Activity[];
  year: number;
  month: number;
}

const DISPLAY_CATEGORIES = Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[];

export function WorkoutBreakdownCard({ activities, prevActivities, year, month }: Props) {
  const stats = useMemo(() => {
    const totalSessions = activities.length;
    const hours = totalTime(activities) / 3600;
    const cals = totalCalories(activities);
    const activeDays = new Set(
      activities.map((a) => parseLocal(a.start_date_local).getDate())
    ).size;
    const totalDays = daysElapsedInMonth(year, month);
    const consistency = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

    const byCategory: Record<string, { sessions: number; hours: number }> = {};
    for (const a of activities) {
      const cat = getTrainingCategory(a);
      if (!byCategory[cat]) byCategory[cat] = { sessions: 0, hours: 0 };
      byCategory[cat].sessions += 1;
      byCategory[cat].hours += a.elapsed_time / 3600;
    }

    const rows = DISPLAY_CATEGORIES
      .filter((cat) => byCategory[cat])
      .map((cat) => ({
        cat,
        label: CATEGORY_CONFIG[cat]?.label ?? cat.toUpperCase(),
        color: CATEGORY_CONFIG[cat]?.color ?? "#999",
        sessions: byCategory[cat].sessions,
        hours: byCategory[cat].hours,
      }))
      .sort((a, b) => b.hours - a.hours);

    const chartData = rows.map((r) => ({
      name: r.label,
      hours: Math.round(r.hours * 10) / 10,
      color: r.color,
    }));

    return { totalSessions, hours, cals, activeDays, totalDays, consistency, rows, chartData };
  }, [activities, year, month]);

  const delta = prevActivities.length > 0 ? {
    sessions: stats.totalSessions - prevActivities.length,
    hours: stats.hours - totalTime(prevActivities) / 3600,
  } : null;

  if (activities.length === 0) {
    return (
      <div className="border-2 border-foreground p-4 h-full flex flex-col">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Workout Breakdown</h3>
        <p className="text-sm text-muted-foreground font-mono">No training data for this month.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground p-4 space-y-4 h-full flex flex-col">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Workout Breakdown</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Sessions", value: stats.totalSessions },
          { label: "Hours", value: stats.hours.toFixed(1) },
          { label: "Calories", value: stats.cals > 0 ? Math.round(stats.cals).toLocaleString() : "—" },
          { label: "Consistency", value: `${stats.consistency}%` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
            <div className="text-2xl font-mono font-black leading-none">{value}</div>
          </div>
        ))}
      </div>

      {/* Active days + month-over-month delta */}
      <div className="text-[10px] text-muted-foreground font-mono">
        {stats.activeDays} active days out of {stats.totalDays}
      </div>
      {delta && (
        <div className="text-[9px] font-mono text-muted-foreground flex gap-2">
          <span style={{ color: delta.sessions > 0 ? "#22c55e" : delta.sessions < 0 ? "#ef4444" : undefined }}>
            {delta.sessions > 0 ? "+" : ""}{delta.sessions} sessions
          </span>
          <span style={{ color: delta.hours > 0 ? "#22c55e" : delta.hours < 0 ? "#ef4444" : undefined }}>
            {delta.hours > 0 ? "+" : ""}{delta.hours.toFixed(1)}h
          </span>
          <span>vs last month{isCurrentMonth(year, month) ? " (to date)" : ""}</span>
        </div>
      )}

      {/* Chart */}
      {stats.chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(100, stats.chartData.length * 26)}>
          <BarChart data={stats.chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
            <XAxis
              type="number"
              tick={{ fontSize: 9, fill: "#999" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 9, fill: "#999" }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                background: "#000", border: "none", color: "#fff",
                fontSize: 11, fontFamily: "Space Mono, monospace",
              }}
              formatter={(v) => [`${v}h`, "Hours"]}
            />
            <Bar dataKey="hours" radius={0}>
              {stats.chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Category table */}
      <div className="space-y-1">
        {stats.rows.map((r) => (
          <div key={r.cat} className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-2 h-2 shrink-0" style={{ backgroundColor: r.color }} />
            <span className="flex-1 text-muted-foreground uppercase text-[9px] tracking-wider">{r.label}</span>
            <span className="text-foreground">{r.sessions} sessions</span>
            <span className="text-muted-foreground w-12 text-right">{r.hours.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
