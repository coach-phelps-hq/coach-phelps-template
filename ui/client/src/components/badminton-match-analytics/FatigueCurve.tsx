/**
 * FatigueCurve - Dual-axis line chart.
 * X: game number in session. Y-left: win rate %. Y-right: avg score margin.
 * Fix 3: Positions with <10 data points rendered as dashed segments.
 * Bug 1: Uses mode-aware game set via getSessionGames.
 */
import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";
import type { ParsedGame } from "@/lib/matchParser";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
}

interface DataPoint {
  gameNum: number;
  winPct: number;
  avgMargin: number;
  count: number;
  /** true if count >= 10 (solid line), false for dashed */
  highConfidence: boolean;
}

const MIN_SAMPLES = 5;
const CONFIDENCE_THRESHOLD = 10;

export function FatigueCurve({ sessions, mode }: Props) {
  const data = useMemo(() => {
    const byPosition = new Map<number, ParsedGame[]>();
    for (const s of sessions) {
      const games = getSessionGames(s, mode);
      // Re-number game positions within the mode-appropriate game set
      games.forEach((g, idx) => {
        const pos = idx + 1;
        if (!byPosition.has(pos)) byPosition.set(pos, []);
        byPosition.get(pos)!.push(g);
      });
    }

    const points: DataPoint[] = [];
    for (const [gameNum, games] of byPosition) {
      if (games.length < MIN_SAMPLES) continue;
      const wins = games.filter((g) => g.result === "W").length;
      const totalMargin = games.reduce((s, g) => s + g.margin, 0);
      points.push({
        gameNum,
        winPct: Math.round((wins / games.length) * 100),
        avgMargin: parseFloat((totalMargin / games.length).toFixed(1)),
        count: games.length,
        highConfidence: games.length >= CONFIDENCE_THRESHOLD,
      });
    }

    points.sort((a, b) => a.gameNum - b.gameNum);
    return points;
  }, [sessions, mode]);

  // Split data into solid (>=10) and dashed (<10) segments for rendering
  // We render two overlapping Line series: one solid, one dashed
  // Solid line: null out low-confidence points; Dashed line: null out high-confidence points
  // But we need connecting segments, so we keep boundary points in both
  const { solidData, dashedData } = useMemo(() => {
    if (data.length === 0) return { solidData: [], dashedData: [] };

    const solidData = data.map((d, i) => {
      // Include this point in solid if it's high confidence
      // OR if it's a boundary (adjacent to a high-confidence point)
      const isHigh = d.highConfidence;
      const prevHigh = i > 0 && data[i - 1].highConfidence;
      const nextHigh = i < data.length - 1 && data[i + 1].highConfidence;
      const include = isHigh || prevHigh || nextHigh;
      return {
        ...d,
        solidWinPct: include ? d.winPct : null,
        solidMargin: include ? d.avgMargin : null,
      };
    });

    const dashedData = data.map((d, i) => {
      const isLow = !d.highConfidence;
      const prevLow = i > 0 && !data[i - 1].highConfidence;
      const nextLow = i < data.length - 1 && !data[i + 1].highConfidence;
      const include = isLow || prevLow || nextLow;
      return {
        ...d,
        dashedWinPct: include ? d.winPct : null,
        dashedMargin: include ? d.avgMargin : null,
      };
    });

    return { solidData, dashedData };
  }, [data]);

  // Merge into single dataset for ComposedChart
  const chartData = useMemo(() => {
    return data.map((d, i) => ({
      ...d,
      solidWinPct: solidData[i]?.solidWinPct ?? null,
      solidMargin: solidData[i]?.solidMargin ?? null,
      dashedWinPct: dashedData[i]?.dashedWinPct ?? null,
      dashedMargin: dashedData[i]?.dashedMargin ?? null,
    }));
  }, [data, solidData, dashedData]);

  const hasLowConfidence = data.some((d) => !d.highConfidence);

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        Not enough data for fatigue analysis
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-1">Fatigue Curve</h3>
      <p className="text-[10px] text-muted-foreground mb-3">
        Performance by game position in session (min {MIN_SAMPLES} data points)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="gameNum"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            label={{ value: "Game #", position: "insideBottom", offset: -2, fontSize: 10, className: "fill-muted-foreground" }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
            width={35}
          />
          <ReferenceLine yAxisId="left" y={50} stroke="#888" strokeDasharray="3 3" strokeOpacity={0.4} />
          <ReferenceLine yAxisId="right" y={0} stroke="#888" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as DataPoint;
              return (
                <div className="bg-popover border rounded px-3 py-2 text-xs shadow-md">
                  <div className="font-semibold">Game #{d.gameNum}</div>
                  <div>Win rate: {d.winPct}%</div>
                  <div>Avg margin: {d.avgMargin > 0 ? "+" : ""}{d.avgMargin}</div>
                  <div className="text-muted-foreground">
                    N={d.count}{d.count < CONFIDENCE_THRESHOLD ? " (low sample)" : ""}
                  </div>
                </div>
              );
            }}
          />
          {/* Solid win% line (high confidence) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="solidWinPct"
            stroke="#2d8a4e"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Win % (solid)"
            legendType="none"
          />
          {/* Dashed win% line (low confidence) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="dashedWinPct"
            stroke="#2d8a4e"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls={false}
            name="Win % (dashed)"
            legendType="none"
          />
          {/* Dots for all points */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="winPct"
            stroke="transparent"
            strokeWidth={0}
            dot={{ r: 3, fill: "#2d8a4e" }}
            activeDot={false}
            name="Win %"
            legendType="none"
          />
          {/* Solid margin line (high confidence) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="solidMargin"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Margin (solid)"
            legendType="none"
          />
          {/* Dashed margin line (low confidence) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="dashedMargin"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls={false}
            name="Margin (dashed)"
            legendType="none"
          />
          {/* Dots for margin */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgMargin"
            stroke="transparent"
            strokeWidth={0}
            dot={{ r: 3, fill: "#f97316" }}
            activeDot={false}
            name="Avg Margin"
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#2d8a4e] inline-block" /> Win rate (left)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#f97316] inline-block" /> Score margin (right)
        </span>
        {hasLowConfidence && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground inline-block" /> &lt;10 sessions
          </span>
        )}
      </div>
    </div>
  );
}
