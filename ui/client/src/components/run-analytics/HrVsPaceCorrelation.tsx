import { useMemo } from "react";
import { Activity } from "@/lib/activities";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { paceSecPerKm, formatPace } from "./shared";

export function HrVsPaceCorrelation({ runs, onRunClick }: { runs: Activity[]; onRunClick?: (id: number) => void }) {
  const data = useMemo(() => {
    return runs
      .filter((a) => a.has_heartrate && a.average_heartrate && a.distance && a.moving_time)
      .map((a) => {
        const pace = paceSecPerKm(a)!;
        return {
          id: a.id,
          hr: Math.round(a.average_heartrate!),
          pace: Math.round(pace),
          paceLabel: formatPace(pace),
          km: Math.round((a.distance / 1000) * 10) / 10,
        };
      });
  }, [runs]);

  if (data.length < 3) {
    return (
      <ChartCard title="HR vs Pace">
        <p className="text-xs text-muted-foreground">Not enough runs with heart rate data yet.</p>
      </ChartCard>
    );
  }

  const hrs = data.map((d) => d.hr);
  const paces = data.map((d) => d.pace);
  const hrMin = Math.min(...hrs) - 5;
  const hrMax = Math.max(...hrs) + 5;
  const paceMin = Math.min(...paces) - 15;
  const paceMax = Math.max(...paces) + 15;

  return (
    <ChartCard title="HR vs Pace">
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart>
          <XAxis
            dataKey="hr"
            type="number"
            domain={[hrMin, hrMax]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Avg HR (bpm)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#999" }}
          />
          <YAxis
            dataKey="pace"
            type="number"
            domain={[paceMin, paceMax]}
            reversed
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}`}
          />
          <ZAxis dataKey="km" range={[30, 220]} />
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
                  <div>{d.paceLabel}</div>
                  <div>{d.hr} bpm</div>
                  <div className="text-white/60">{d.km}km</div>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            fill="#c44020"
            cursor={onRunClick ? "pointer" : undefined}
            onClick={(point: any) => {
              const id = point?.id;
              if (onRunClick && id) onRunClick(id);
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
