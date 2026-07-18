import { useMemo } from "react";
import { Activity, groupByWeek } from "@/lib/activities";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";
import { computeSessionTrimp } from "./shared";

export function WeeklyLoadChart({ sessions }: { sessions: Activity[] }) {
  const data = useMemo(() => {
    const weeks = groupByWeek(sessions);
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([weekKey, acts]) => {
        const d = new Date(weekKey);
        const load = acts.reduce((s, a) => s + computeSessionTrimp(a), 0);
        return {
          week: `${d.getDate()}/${d.getMonth() + 1}`,
          load,
        };
      });
  }, [sessions]);

  return (
    <ChartCard title="Weekly Training Load (TRIMP)">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="25%">
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number) => [`${v} TRIMP`, "Load"]}
          />
          <Bar dataKey="load" fill="#2d8a4e" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
