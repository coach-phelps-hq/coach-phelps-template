import { useMemo } from "react";
import { Activity, groupByWeek } from "@/lib/activities";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";

export function WeeklyDistanceChart({ runs }: { runs: Activity[] }) {
  const data = useMemo(() => {
    const weeks = groupByWeek(runs);
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([weekKey, acts]) => {
        const d = new Date(weekKey);
        const totalKm = acts.reduce((s, a) => s + (a.distance ?? 0), 0) / 1000;
        return {
          week: `${d.getDate()}/${d.getMonth() + 1}`,
          km: Math.round(totalKm * 10) / 10,
        };
      });
  }, [runs]);

  return (
    <ChartCard title="Weekly Distance">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="25%">
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => `${v}k`} />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number) => [`${v} km`, "Distance"]}
          />
          <Bar dataKey="km" fill="#c44020" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
