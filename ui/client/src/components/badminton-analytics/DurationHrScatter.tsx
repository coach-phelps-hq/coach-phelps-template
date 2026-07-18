import { useMemo } from "react";
import { Activity } from "@/lib/activities";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "./ChartCard";

export function DurationHrScatter({ sessions, onSessionClick }: { sessions: Activity[]; onSessionClick?: (id: number) => void }) {
  const data = useMemo(() => {
    return sessions
      .filter((s) => s.has_heartrate && s.average_heartrate && s.moving_time)
      .map((s) => ({
        id: s.id,
        mins: Math.round(s.moving_time / 60),
        hr: Math.round(s.average_heartrate!),
      }));
  }, [sessions]);

  if (data.length < 3) {
    return (
      <ChartCard title="Duration vs HR">
        <p className="text-xs text-muted-foreground">Not enough sessions with heart rate data yet.</p>
      </ChartCard>
    );
  }

  const mins = data.map((d) => d.mins);
  const hrs = data.map((d) => d.hr);
  const minMins = Math.min(...mins) - 10;
  const maxMins = Math.max(...mins) + 10;
  const minHr = Math.min(...hrs) - 5;
  const maxHr = Math.max(...hrs) + 5;

  return (
    <ChartCard title="Duration vs HR">
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart>
          <XAxis
            dataKey="mins"
            type="number"
            domain={[minMins, maxMins]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Duration (min)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#999" }}
          />
          <YAxis
            dataKey="hr"
            type="number"
            domain={[minHr, maxHr]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div
                  style={{ background: "#000", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
                  className="px-3 py-2"
                >
                  <div>{d.mins} min</div>
                  <div>{d.hr} bpm</div>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            fill="#2d8a4e"
            cursor={onSessionClick ? "pointer" : undefined}
            onClick={(point: any) => {
              const id = point?.id;
              if (onSessionClick && id) onSessionClick(id);
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
