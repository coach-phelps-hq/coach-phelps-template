import { useMemo } from "react";
import { Activity, formatDistance, parseLocal } from "@/lib/activities";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";

export function CadenceTrendChart({ runs }: { runs: Activity[] }) {
  const data = useMemo(() => {
    return runs
      .filter((a) => a.average_cadence)
      .slice(0, 20)
      .reverse()
      .map((a) => {
        const d = parseLocal(a.start_date_local);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          cadence: Math.round(a.average_cadence!),
          dist: formatDistance(a.distance),
        };
      });
  }, [runs]);

  const cadMin = Math.min(...data.map((d) => d.cadence)) - 2;
  const cadMax = Math.max(...data.map((d) => d.cadence)) + 2;

  return (
    <ChartCard title="Cadence Trend (last 20 runs)">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[cadMin, cadMax]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number, _: string, props: any) => [`${v} spm — ${props.payload.dist}`, "Cadence"]}
          />
          <Line type="monotone" dataKey="cadence" stroke="#c44020" strokeWidth={2} dot={{ r: 3, fill: "#c44020" }} name="Cadence" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
