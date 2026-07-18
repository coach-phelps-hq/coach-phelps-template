import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface SleepEntry {
  date: string;
  hours: number;
  resting_hr: number | null;
  notes: string;
}

interface Props {
  sleepLog: SleepEntry[];
  prevSleepLog: SleepEntry[];
  year: number;
  month: number;
}

export function SleepSummaryCard({ sleepLog, prevSleepLog, year, month }: Props) {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const entries = useMemo(
    () => sleepLog.filter((e) => e.date.startsWith(monthKey)),
    [sleepLog, monthKey]
  );

  if (entries.length === 0) {
    return (
      <div className="border-2 border-foreground p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Sleep</h3>
        <p className="text-sm text-muted-foreground font-mono">No sleep data for this month.</p>
      </div>
    );
  }

  const avgHours = entries.reduce((s, e) => s + e.hours, 0) / entries.length;
  const nightsHit = entries.filter((e) => e.hours >= 7).length;
  const hitPct = Math.round((nightsHit / entries.length) * 100);

  const prevAvg = prevSleepLog.length > 0
    ? prevSleepLog.reduce((s, e) => s + e.hours, 0) / prevSleepLog.length
    : null;
  const deltaAvg = prevAvg !== null ? avgHours - prevAvg : null;

  const chartData = entries.map((e) => {
    const day = parseInt(e.date.slice(8), 10);
    const mon = parseInt(e.date.slice(5, 7), 10);
    return {
      day,
      label: `${String(day).padStart(2, "0")}/${String(mon).padStart(2, "0")}`,
      hours: Math.round(e.hours * 100) / 100,
    };
  });

  return (
    <div className="border-2 border-foreground p-4 space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Sleep</h3>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Avg / night</div>
          <div className="text-2xl font-mono font-black leading-none">{avgHours.toFixed(1)}h</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">7hr nights</div>
          <div className="text-2xl font-mono font-black leading-none">{nightsHit}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Hit rate</div>
          <div className="text-2xl font-mono font-black leading-none">{hitPct}%</div>
        </div>
      </div>

      {deltaAvg !== null && (
        <div className="text-[9px] font-mono" style={{ color: deltaAvg > 0 ? "#22c55e" : deltaAvg < 0 ? "#ef4444" : undefined }}>
          {deltaAvg > 0 ? "+" : ""}{deltaAvg.toFixed(1)}h avg vs last month
        </div>
      )}

      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={chartData} barCategoryGap="10%">
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={26}
            tickFormatter={(v) => `${v}h`}
          />
          <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
          <Tooltip
            contentStyle={{
              background: "#000", border: "none", color: "#fff",
              fontSize: 11, fontFamily: "Space Mono, monospace",
            }}
            formatter={(v: number) => [`${v}h`, "Sleep"]}
            labelFormatter={(_l, payload) => payload?.[0]?.payload?.label ?? ""}
          />
          <Bar
            dataKey="hours"
            radius={0}
            fill="#a78bfa"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
