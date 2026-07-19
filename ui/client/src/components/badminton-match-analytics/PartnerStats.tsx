/**
 * PartnerStats - Sortable table with "Best Partner" callout.
 * Mirrors OpponentStats structure. Min 3 games to show.
 * Top 15 by default with "Show all" expand.
 */
import { useMemo, useState } from "react";
import { Users, ChevronUp, ChevronDown } from "lucide-react";
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
  onPartnerClick?: (partner: string) => void;
}

interface PartnerRow {
  name: string;
  games: number;
  wins: number;
  winPct: number;
  avgScoreDiff: number;
  recentForm: FormTrend;
  isBest: boolean;
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

export function PartnerStats({ sessions, mode, onPartnerClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState(false);

  const partners = useMemo(() => {
    const map = new Map<string, ParsedGame[]>();
    for (const s of sessions) {
      for (const g of getSessionGames(s, mode)) {
        if (!map.has(g.partner)) map.set(g.partner, []);
        map.get(g.partner)!.push(g);
      }
    }

    const rows: PartnerRow[] = [];
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
        isBest: false,
      });
    }

    // Best Partner: top 3 by composite score = games × winPct/100, min 10 games, >50% win rate
    const bestCandidates = rows
      .filter((r) => r.games >= 10 && r.winPct >= 50)
      .sort((a, b) => b.games * (b.winPct / 100) - a.games * (a.winPct / 100));
    const bestNames = new Set(bestCandidates.slice(0, 3).map((r) => r.name));
    for (const row of rows) {
      row.isBest = bestNames.has(row.name);
    }

    return rows;
  }, [sessions, mode]);

  const bestPartners = useMemo(
    () => partners.filter((p) => p.isBest).sort((a, b) => b.games * (b.winPct / 100) - a.games * (a.winPct / 100)),
    [partners],
  );

  const sorted = useMemo(() => {
    const arr = [...partners];
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
  }, [partners, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (partners.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        Not enough partner data
      </div>
    );
  }

  const visiblePartners = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const hasMore = sorted.length > DEFAULT_VISIBLE;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-sm font-bold mb-2">Partner Stats</h3>

      {/* Best Partner callout */}
      {bestPartners.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-green-600 bg-green-500/5 px-2.5 py-1.5 rounded border border-green-500/20">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">Best:</span>
          <span className="text-foreground">
            {bestPartners.map((p, i) => (
              <span key={p.name}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <button
                  className="hover:underline"
                  onClick={() => onPartnerClick?.(p.name)}
                >
                  {p.name}
                </button>
                <span className="text-muted-foreground"> ({p.winPct}%, {p.avgScoreDiff > 0 ? "+" : ""}{p.avgScoreDiff})</span>
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
                  Partner <SortIcon active={sortKey === "name"} dir={sortDir} />
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
                    <p className="text-xs max-w-48">Average point differential per game when paired with this partner</p>
                  </TooltipContent>
                </UITooltip>
              </th>
              <th className="text-center py-1.5 font-medium">Form</th>
            </tr>
          </thead>
          <tbody>
            {visiblePartners.map((p) => (
              <tr
                key={p.name}
                className={`border-b border-muted/50 hover:bg-muted/30 transition-colors ${
                  p.isBest ? "bg-green-500/5" : ""
                }`}
              >
                <td className="py-1.5 flex items-center gap-1.5">
                  {p.isBest && <Users className="w-3 h-3 text-green-600 shrink-0" />}
                  <button
                    className="text-left hover:underline font-medium truncate"
                    onClick={() => onPartnerClick?.(p.name)}
                  >
                    {p.name}
                  </button>
                </td>
                <td className="text-right py-1.5 text-muted-foreground">{p.games}</td>
                <td className="text-right py-1.5 font-mono font-semibold">
                  <span className={p.winPct >= 50 ? "text-green-600" : "text-red-500"}>
                    {p.winPct}%
                  </span>
                </td>
                <td className="text-right py-1.5 font-mono">
                  <span className={p.avgScoreDiff >= 0 ? "text-green-600" : "text-red-500"}>
                    {p.avgScoreDiff > 0 ? "+" : ""}{p.avgScoreDiff}
                  </span>
                </td>
                <td className="py-1.5 flex justify-center">
                  <FormArrow form={p.recentForm} />
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
            <>Show all {sorted.length} partners <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
