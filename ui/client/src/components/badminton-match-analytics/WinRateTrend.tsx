/**
 * WinRateTrend - Line chart: per-session win rate + rolling 4-week average.
 * Fix 2: X-axis labels show year on January and first/last data points.
 * Bug 1: Uses mode-aware stats via getSessionStats.
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionStats, getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
  onSessionClick?: (activityId: number) => void;
}

interface DataPoint {
  date: string;
  label: string;
  winPct: number;
  rolling: number | null;
  activityId: number;
  wins: number;
  losses: number;
}

export function WinRateTrend({ sessions, mode, onSessionClick }: Props) {
  const data = useMemo(() => {
    let prevYear: number | null = null;

    const points: DataPoint[] = sessions.map((s, idx) => {
      const d = new Date(s.activity.start_date_local);
      const month = d.toLocaleDateString("en-GB", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      const shortYear = `'${String(year).slice(2)}`;

      // Show year on: January, first point, last point, or year change
      const isFirst = idx === 0;
      const isLast = idx === sessions.length - 1;
      const isJan = d.getMonth() === 0;
      const yearChanged = prevYear !== null && year !== prevYear;
      prevYear = year;

      const showYear = isFirst || isLast || isJan || yearChanged;
      const label = showYear ? `${day} ${month} ${shortYear}` : `${day} ${month}`;

      const stats = getSessionStats(s, mode);

      return {
        date: s.activity.start_date_local.slice(0, 10),
        label,
        winPct: stats.winPct,
        rolling: null,
        activityId: s.activity.id,
        wins: stats.wins,
        losses: stats.losses,
      };
    });

    // Compute rolling 4-week average (game-weighted)
    for (let i = 0; i < points.length; i++) {
      const cutoff = new Date(points[i].date);
      cutoff.setDate(cutoff.getDate() - 28);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const window = points.filter((_, j) => j <= i && points[j].date >= cutoffStr);
      if (window.length >= 2) {
        const totalWins = window.reduce((s, p) => s + p.wins, 0);
        const totalGames = window.reduce((s, p) => s + p.wins + p.losses, 0);
        points[i].rolling = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : null;
      }
    }

    return points;
  }, [sessions, mode]);

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        No session data available
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-3">Win Rate Trend</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <ReferenceLine y={50} stroke="#888" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as DataPoint;
              return (
                <div className="bg-popover border rounded px-3 py-2 text-xs shadow-md">
                  <div className="font-semibold">{d.date}</div>
                  <div>Win rate: {d.winPct}%</div>
                  <div className="text-muted-foreground">
                    {d.wins}W-{d.losses}L
                  </div>
                  {d.rolling !== null && (
                    <div className="text-muted-foreground">4-week avg: {d.rolling}%</div>
                  )}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="rolling"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            connectNulls
            name="4-week avg"
          />
          <Line
            type="linear"
            dataKey="winPct"
            stroke="#2d8a4e"
            strokeWidth={1}
            strokeOpacity={0.3}
            dot={{ r: 4, fill: "#2d8a4e", cursor: "pointer" }}
            activeDot={{
              r: 6,
              fill: "#2d8a4e",
              onClick: (_: any, payload: any) => {
                if (onSessionClick && payload?.payload?.activityId) {
                  onSessionClick(payload.payload.activityId);
                }
              },
            }}
            name="Session"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#2d8a4e] inline-block" /> Per session
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#60a5fa] inline-block" /> 4-week rolling avg
        </span>
      </div>
    </div>
  );
}
