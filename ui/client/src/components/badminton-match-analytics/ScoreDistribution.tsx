/**
 * ScoreDistribution - Histogram / stacked bar.
 * Fix 7: Auto-generated coaching insight below chart when tallest bar is a loss bucket.
 * Bug 1: Uses mode-aware game set via getSessionGames.
 */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useMemo } from "react";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
}

interface Bucket {
  label: string;
  count: number;
  color: string;
  pct: number;
  isLoss: boolean;
}

const BUCKET_DEFS = [
  { label: "Blowout W", min: 8, max: 99, result: "W", color: "#166534", isLoss: false, desc: "Blowout Win (8+ pts)" },
  { label: "Comfy W", min: 4, max: 7, result: "W", color: "#2d8a4e", isLoss: false, desc: "Comfortable Win (4-7 pts)" },
  { label: "Close W", min: 1, max: 3, result: "W", color: "#6ee7b7", isLoss: false, desc: "Close Win (1-3 pts)" },
  { label: "Close L", min: 1, max: 3, result: "L", color: "#fca5a5", isLoss: true, desc: "Close Loss (1-3 pts)" },
  { label: "Comfy L", min: 4, max: 7, result: "L", color: "#dc2626", isLoss: true, desc: "Comfortable Loss (4-7 pts)" },
  { label: "Blowout L", min: 8, max: 99, result: "L", color: "#991b1b", isLoss: true, desc: "Blowout Loss (8+ pts)" },
];

const COACHING_INSIGHTS: Record<string, string> = {
  "Comfy L": "You're competitive but not closing.",
  "Close L": "You're right there - tighten up the endgame.",
  "Blowout L": "Getting outclassed - consider opponent selection or fundamentals work.",
};

export function ScoreDistribution({ sessions, mode }: Props) {
  const data = useMemo(() => {
    const allGames = sessions.flatMap((s) => getSessionGames(s, mode));
    const total = allGames.length;

    const buckets: Bucket[] = BUCKET_DEFS.map((def) => {
      const count = allGames.filter((g) => {
        const absMargin = Math.abs(g.margin);
        return g.result === def.result && absMargin >= def.min && absMargin <= def.max;
      }).length;
      return {
        label: def.label,
        count,
        color: def.color,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        isLoss: def.isLoss,
      };
    });

    return buckets;
  }, [sessions, mode]);

  const total = data.reduce((s, b) => s + b.count, 0);

  // Fix 7: Find tallest bucket and generate insight if it's a loss
  const insight = useMemo(() => {
    if (total === 0) return null;
    const tallest = data.reduce((max, b) => (b.count > max.count ? b : max), data[0]);
    if (!tallest.isLoss) return null;
    const desc = BUCKET_DEFS.find((d) => d.label === tallest.label)?.desc ?? tallest.label;
    const coaching = COACHING_INSIGHTS[tallest.label] ?? "";
    return `Most common result: ${desc} - ${tallest.pct}% of games. ${coaching}`;
  }, [data, total]);

  if (total === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        No score data available
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-1">Score Distribution</h3>
      <p className="text-[10px] text-muted-foreground mb-3">{total} games</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9 }}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            width={30}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as Bucket;
              return (
                <div className="bg-popover border rounded px-3 py-2 text-xs shadow-md">
                  <div className="font-semibold">{d.label}</div>
                  <div>{d.count} games ({d.pct}%)</div>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Fix 7: Coaching insight */}
      {insight && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          {insight}
        </p>
      )}
    </div>
  );
}
