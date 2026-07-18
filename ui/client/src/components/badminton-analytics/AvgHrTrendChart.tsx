import { useMemo } from "react";
import { Activity, parseLocal } from "@/lib/activities";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";

export function AvgHrTrendChart({ sessions }: { sessions: Activity[] }) {
  const data = useMemo(() => {
    return sessions
      .filter((s) => s.average_heartrate)
      .slice(0, 20)
      .reverse()
      .map((s) => {
        const d = parseLocal(s.start_date_local);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          hr: Math.round(s.average_heartrate!),
        };
      });
  }, [sessions]);

  if (data.length === 0) {
    return (
      <ChartCard title="Avg HR Trend (last 20 sessions)">
        <p className="text-xs text-muted-foreground">No heart rate data available.</p>
      </ChartCard>
    );
  }

  const minHr = Math.min(...data.map((d) => d.hr)) - 5;
  const maxHr = Math.max(...data.map((d) => d.hr)) + 5;

  return (
    <ChartCard title="Avg HR Trend (last 20 sessions)">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[minHr, maxHr]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={28}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number) => [`${v} bpm`, "Avg HR"]}
          />
          <Line type="monotone" dataKey="hr" stroke="#2d8a4e" strokeWidth={2} dot={{ r: 3, fill: "#2d8a4e" }} name="Avg HR" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
