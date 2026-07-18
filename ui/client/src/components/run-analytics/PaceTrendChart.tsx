import { useMemo } from "react";
import { Activity, formatDistance, parseLocal } from "@/lib/activities";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";
import { paceSecPerKm, formatPace } from "./shared";

export function PaceTrendChart({ runs, onRunClick }: { runs: Activity[]; onRunClick?: (id: number) => void }) {
  const data = useMemo(() => {
    return runs
      .filter((a) => a.distance && a.moving_time)
      .slice(0, 20)
      .reverse()
      .map((a) => {
        const d = parseLocal(a.start_date_local);
        const pace = paceSecPerKm(a)!;
        return {
          id: a.id,
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          pace: Math.round(pace),
          paceLabel: formatPace(pace),
          dist: formatDistance(a.distance),
        };
      });
  }, [runs]);

  // Y axis: flip so faster (lower sec/km) is higher on chart
  const paceMin = Math.min(...data.map((d) => d.pace)) - 15;
  const paceMax = Math.max(...data.map((d) => d.pace)) + 15;

  return (
    <ChartCard title="Pace Trend (last 20 runs)">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[paceMin, paceMax]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={38}
            reversed
            tickFormatter={(v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`}
          />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(_: number, __: string, props: any) => [props.payload.paceLabel, "Pace"]}
          />
          <Line
            type="monotone"
            dataKey="pace"
            stroke="#c44020"
            strokeWidth={2}
            dot={{ r: 3, fill: "#c44020", cursor: onRunClick ? "pointer" : undefined }}
            activeDot={{
              r: 6,
              fill: "#c44020",
              cursor: onRunClick ? "pointer" : undefined,
              onClick: (_: any, payload: any) => {
                const id = payload?.payload?.id;
                if (onRunClick && id) onRunClick(id);
              },
            }}
            name="Pace"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
