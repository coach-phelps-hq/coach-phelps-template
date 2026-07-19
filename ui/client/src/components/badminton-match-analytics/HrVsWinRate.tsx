/**
 * HrVsWinRate - Scatter plot.
 * X: Average HR. Y: Session win rate (%). Dot size: number of games.
 * Bug 1 fix: Uses mode-aware stats via getSessionStats / getSessionGames.
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ZAxis,
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
  avgHr: number;
  winPct: number;
  games: number;
  date: string;
  name: string;
  activityId: number;
}

export function HrVsWinRate({ sessions, mode, onSessionClick }: Props) {
  const data = useMemo(() => {
    return sessions
      .filter((s) => s.activity.has_heartrate && s.activity.average_heartrate)
      .map((s) => ({
        avgHr: Math.round(s.activity.average_heartrate!),
        winPct: getSessionStats(s, mode).winPct,
        games: getSessionGames(s, mode).length,
        date: s.activity.start_date_local.slice(0, 10),
        name: s.activity.name,
        activityId: s.activity.id,
      }))
      .filter((d) => d.games > 0);
  }, [sessions, mode]);

  if (data.length < 3) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        Not enough HR data for scatter plot (need 3+ sessions)
      </div>
    );
  }

  const minHr = Math.min(...data.map((d) => d.avgHr)) - 5;
  const maxHr = Math.max(...data.map((d) => d.avgHr)) + 5;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-1">HR vs Win Rate</h3>
      <p className="text-[10px] text-muted-foreground mb-3">
        Does higher intensity correlate with better results?
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="avgHr"
            type="number"
            domain={[minHr, maxHr]}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            label={{ value: "Avg HR (bpm)", position: "insideBottom", offset: -2, fontSize: 10, className: "fill-muted-foreground" }}
          />
          <YAxis
            dataKey="winPct"
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <ZAxis dataKey="games" range={[40, 300]} />
          <ReferenceLine y={50} stroke="#888" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as DataPoint;
              return (
                <div className="bg-popover border rounded px-3 py-2 text-xs shadow-md">
                  <div className="font-semibold">{d.date}</div>
                  <div className="text-muted-foreground truncate max-w-48">{d.name}</div>
                  <div>Win rate: {d.winPct}%</div>
                  <div>Avg HR: {d.avgHr} bpm</div>
                  <div className="text-muted-foreground">{d.games} games</div>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            fill="#2d8a4e"
            fillOpacity={0.6}
            cursor="pointer"
            onClick={(point: any) => {
              if (onSessionClick && point?.activityId) {
                onSessionClick(point.activityId);
              }
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="text-[10px] text-muted-foreground mt-1">
        Dot size = number of games in session
      </div>
    </div>
  );
}
