/**
 * SummaryBanner - Row of 4-5 stat cards between header and first chart.
 * Fix 4: Overall Win Rate, Total Games, Sessions, Best Month, Current Form.
 * Reacts to Ranked/All toggle via mode prop.
 */
import { useMemo } from "react";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionStats, getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
}

export function SummaryBanner({ sessions, mode }: Props) {
  const stats = useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;

    // Per-month aggregation
    const monthMap = new Map<string, { wins: number; losses: number }>();

    for (const s of sessions) {
      const st = getSessionStats(s, mode);
      totalWins += st.wins;
      totalLosses += st.losses;

      const d = new Date(s.activity.start_date_local);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { wins: 0, losses: 0 });
      const m = monthMap.get(key)!;
      m.wins += st.wins;
      m.losses += st.losses;
    }

    const totalGames = totalWins + totalLosses;
    const overallWinPct = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    // Best month (min 10 games)
    let bestMonth = "-";
    let bestPct = 0;
    for (const [key, m] of monthMap) {
      const total = m.wins + m.losses;
      if (total < 10) continue;
      const pct = Math.round((m.wins / total) * 100);
      if (pct > bestPct) {
        bestPct = pct;
        const [y, mo] = key.split("-");
        const monthName = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-GB", { month: "short" });
        bestMonth = `${monthName} ${y} (${pct}%)`;
      }
    }

    // Current form: count consecutive W/L sessions from most recent
    let streak = 0;
    let streakType: "W" | "L" | null = null;
    const reversed = [...sessions].reverse();
    for (const s of reversed) {
      const st = getSessionStats(s, mode);
      const isWin = st.winPct >= 50;
      const type = isWin ? "W" : "L";
      if (streakType === null) streakType = type;
      if (type === streakType) {
        streak++;
      } else {
        break;
      }
    }
    const formLabel = streakType === "W"
      ? `${streak} session win streak`
      : streakType === "L"
        ? `${streak} session losing streak`
        : "-";

    return { overallWinPct, totalGames, sessionCount: sessions.length, bestMonth, formLabel };
  }, [sessions, mode]);

  const cards = [
    { label: "Win Rate", value: `${stats.overallWinPct}%`, accent: stats.overallWinPct >= 50 },
    { label: "Games", value: String(stats.totalGames), accent: null },
    { label: "Sessions", value: String(stats.sessionCount), accent: null },
    { label: "Best Month", value: stats.bestMonth, accent: null },
    { label: "Current Form", value: stats.formLabel, accent: null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="border-2 border-foreground p-3 bg-card"
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {c.label}
          </div>
          <div
            className={`font-mono font-bold text-lg leading-tight ${
              c.accent === true ? "text-green-600" : c.accent === false ? "text-red-500" : ""
            }`}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
