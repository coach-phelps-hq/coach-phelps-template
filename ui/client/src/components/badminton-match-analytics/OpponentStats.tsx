/**
 * OpponentStats - Sortable table with nemesis callout.
 * Fix 5: "Avg Diff" → "Score Diff" with hover tooltip.
 * Fix 6: Compact nemesis callout row above the table.
 * Bug 1: Uses mode-aware game set via getSessionGames.
 */
import { useMemo, useState } from "react";
import { Skull, ChevronUp, ChevronDown } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";
import type { ParsedGame } from "@/lib/matchParser";
import { computeForm, FormArrow, type FormTrend } from "./shared";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
  onOpponentClick?: (opponent: string) => void;
}

interface OpponentRow {
  name: string;
  games: number;
  wins: number;
  winPct: number;
  avgScoreDiff: number;
  recentForm: FormTrend;
  isNemesis: boolean;
}

type SortKey = "name" | "games" | "winPct" | "avgScoreDiff";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronDown className="w-3 h-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

const DEFAULT_VISIBLE = 15;

export function OpponentStats({ sessions, mode, onOpponentClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState(false);

  const opponents = useMemo(() => {
    const map = new Map<string, ParsedGame[]>();
    for (const s of sessions) {
      for (const g of getSessionGames(s, mode)) {
        for (const opp of g.opponents) {
          if (!map.has(opp)) map.set(opp, []);
          map.get(opp)!.push(g);
        }
      }
    }

    const rows: OpponentRow[] = [];
    for (const [name, games] of map) {
      if (games.length < 3) continue;
      const wins = games.filter((g) => g.result === "W").length;
      const totalMargin = games.reduce((s, g) => s + g.margin, 0);
      rows.push({
        name,
        games: games.length,
        wins,
        winPct: Math.round((wins / games.length) * 100),
        avgScoreDiff: parseFloat((totalMargin / games.length).toFixed(1)),
        recentForm: computeForm(games),
        isNemesis: false,
      });
    }

    // Mark nemesis: top 3 by composite score = games × (1 - winPct/100), min 10 games
    // Weights frequent opponents with low win rates over obscure 3-game flukes
    const nemesisCandidates = rows
      .filter((r) => r.games >= 10 && r.winPct < 50)
      .sort((a, b) => b.games * (1 - b.winPct / 100) - a.games * (1 - a.winPct / 100));
    const nemesisNames = new Set(nemesisCandidates.slice(0, 3).map((r) => r.name));
    for (const row of rows) {
      row.isNemesis = nemesisNames.has(row.name);
    }

    return rows;
  }, [sessions, mode]);

  const nemeses = useMemo(
    () => opponents.filter((o) => o.isNemesis).sort((a, b) => b.games * (1 - b.winPct / 100) - a.games * (1 - a.winPct / 100)),
    [opponents],
  );

  const sorted = useMemo(() => {
    const arr = [...opponents];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "games":
          cmp = a.games - b.games;
          break;
        case "winPct":
          cmp = a.winPct - b.winPct;
          break;
        case "avgScoreDiff":
          cmp = a.avgScoreDiff - b.avgScoreDiff;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [opponents, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (opponents.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        Not enough opponent data
      </div>
    );
  }

  const visibleOpponents = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const hasMore = sorted.length > DEFAULT_VISIBLE;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-2">Opponent Stats</h3>

      {/* Fix 6: Nemesis callout above table */}
      {nemeses.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-red-500 bg-red-500/5 px-2.5 py-1.5 rounded border border-red-500/20">
          <Skull className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">Nemesis:</span>
          <span className="text-foreground">
            {nemeses.map((n, i) => (
              <span key={n.name}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <button
                  className="hover:underline"
                  onClick={() => onOpponentClick?.(n.name)}
                >
                  {n.name}
                </button>
                <span className="text-muted-foreground"> ({n.winPct}%, {n.avgScoreDiff > 0 ? "+" : ""}{n.avgScoreDiff})</span>
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-1.5 font-medium">
                <button className="flex items-center gap-0.5" onClick={() => toggleSort("name")}>
                  Opponent <SortIcon active={sortKey === "name"} dir={sortDir} />
                </button>
              </th>
              <th className="text-right py-1.5 font-medium">
                <button className="flex items-center gap-0.5 ml-auto" onClick={() => toggleSort("games")}>
                  Games <SortIcon active={sortKey === "games"} dir={sortDir} />
                </button>
              </th>
              <th className="text-right py-1.5 font-medium">
                <button className="flex items-center gap-0.5 ml-auto" onClick={() => toggleSort("winPct")}>
                  Win% <SortIcon active={sortKey === "winPct"} dir={sortDir} />
                </button>
              </th>
              <th className="text-right py-1.5 font-medium">
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-0.5 ml-auto" onClick={() => toggleSort("avgScoreDiff")}>
                      Score Diff <SortIcon active={sortKey === "avgScoreDiff"} dir={sortDir} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-48">Average point differential per game (positive = you outscore them)</p>
                  </TooltipContent>
                </UITooltip>
              </th>
              <th className="text-center py-1.5 font-medium">Form</th>
            </tr>
          </thead>
          <tbody>
            {visibleOpponents.map((o) => (
              <tr
                key={o.name}
                className={`border-b border-muted/50 hover:bg-muted/30 transition-colors ${
                  o.isNemesis ? "bg-red-500/5" : ""
                }`}
              >
                <td className="py-1.5 flex items-center gap-1.5">
                  {o.isNemesis && <Skull className="w-3 h-3 text-red-500 shrink-0" />}
                  <button
                    className="text-left hover:underline font-medium truncate"
                    onClick={() => onOpponentClick?.(o.name)}
                  >
                    {o.name}
                  </button>
                </td>
                <td className="text-right py-1.5 text-muted-foreground">{o.games}</td>
                <td className="text-right py-1.5 font-mono font-semibold">
                  <span className={o.winPct >= 50 ? "text-green-600" : "text-red-500"}>
                    {o.winPct}%
                  </span>
                </td>
                <td className="text-right py-1.5 font-mono">
                  <span className={o.avgScoreDiff >= 0 ? "text-green-600" : "text-red-500"}>
                    {o.avgScoreDiff > 0 ? "+" : ""}{o.avgScoreDiff}
                  </span>
                </td>
                <td className="py-1.5 flex justify-center">
                  <FormArrow form={o.recentForm} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show all / collapse toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          {expanded ? (
            <>Show top {DEFAULT_VISIBLE} <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Show all {sorted.length} opponents <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
