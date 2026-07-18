import { useMemo } from "react";
import { Activity, parseLocal } from "@/lib/activities";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";
import { computeSessionTrimp } from "./shared";

export function LoadTrendChart({ sessions, onSessionClick }: { sessions: Activity[]; onSessionClick?: (id: number) => void }) {
  const data = useMemo(() => {
    return sessions
      .slice(0, 20)
      .reverse()
      .map((s) => {
        const d = parseLocal(s.start_date_local);
        return {
          id: s.id,
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          load: computeSessionTrimp(s),
        };
      });
  }, [sessions]);

  const minLoad = Math.min(...data.map((d) => d.load)) - 5;
  const maxLoad = Math.max(...data.map((d) => d.load)) + 5;

  return (
    <ChartCard title="Load per Session (last 20)">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[minLoad, maxLoad]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number) => [`${v} TRIMP`, "Load"]}
          />
          <Line
            type="monotone"
            dataKey="load"
            stroke="#2d8a4e"
            strokeWidth={2}
            dot={{ r: 3, fill: "#2d8a4e", cursor: onSessionClick ? "pointer" : undefined }}
            activeDot={{
              r: 6,
              fill: "#2d8a4e",
              cursor: onSessionClick ? "pointer" : undefined,
              onClick: (_: any, payload: any) => {
                const id = payload?.payload?.id;
                if (onSessionClick && id) onSessionClick(id);
              },
            }}
            name="Load"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
