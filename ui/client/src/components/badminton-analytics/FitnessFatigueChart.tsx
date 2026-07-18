import { useMemo } from "react";
import { Activity, groupByWeek } from "@/lib/activities";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartCard } from "./ChartCard";
import { computeWeeklyFitnessFatigue } from "./shared";

export function FitnessFatigueChart({ sessions }: { sessions: Activity[] }) {
  const data = useMemo(() => {
    const weeksMap = groupByWeek(sessions);
    const weeks = Array.from(weeksMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekKey, activities]) => ({ weekKey, activities }));

    const series = computeWeeklyFitnessFatigue(weeks);

    return series.slice(-10).map((w) => {
      const d = new Date(w.weekKey);
      return {
        week: `${d.getDate()}/${d.getMonth() + 1}`,
        fatigue: w.fatigue,
        fitness: w.fitness,
      };
    });
  }, [sessions]);

  return (
    <ChartCard title="Fitness vs Fatigue">
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
          />
          <Legend wrapperStyle={{ fontSize: 9 }} />
          <Line type="monotone" dataKey="fitness" stroke="#2d8a4e" strokeWidth={2} dot={{ r: 2 }} name="Fitness (4wk avg)" />
          <Line type="monotone" dataKey="fatigue" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} name="Fatigue (this wk)" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
