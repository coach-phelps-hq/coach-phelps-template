/**
 * SessionCards - Expandable list, newest first.
 * Bug 1 fix: Collapsed header shows mode-appropriate W-L/Win%.
 * Expanded detail always shows ALL games (ranked + friendly) with labels.
 * Cross-widget linking: highlight/expand via selectedSessionId, filter by partner/opponent.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { AnalyticsSession } from "@/pages/BadmintonMatchAnalytics";
import { getSessionStats, getSessionGames } from "@/pages/BadmintonMatchAnalytics";
import { getAllGames } from "@/lib/matchParser";
import type { GameMode } from "@/components/badminton-match-analytics/GameFilter";
import { formatDuration, formatZoneTime, HR_ZONE_LABELS } from "@/lib/activities";

interface Props {
  sessions: AnalyticsSession[];
  mode: GameMode;
  selectedSessionId?: number | null;
  filterPartner?: string | null;
  filterOpponent?: string | null;
  onClearFilter?: () => void;
}

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  badminton_ranked: { label: "Ranked", color: "#dc2626" },
  badminton_league: { label: "League", color: "#7c3aed" },
  badminton_friendly: { label: "Friendly", color: "#2563eb" },
  badminton_casual: { label: "Casual", color: "#6b7280" },
};

export function SessionCards({
  sessions,
  mode,
  selectedSessionId,
  filterPartner,
  filterOpponent,
  onClearFilter,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Newest first
  const sorted = useMemo(() => [...sessions].reverse(), [sessions]);

  // Filter by partner/opponent using mode-appropriate games
  const filtered = useMemo(() => {
    if (!filterPartner && !filterOpponent) return sorted;
    return sorted.filter((s) => {
      const games = getSessionGames(s, mode);
      if (filterPartner) {
        return games.some((g) => g.partner === filterPartner);
      }
      if (filterOpponent) {
        return games.some((g) => g.opponents.includes(filterOpponent));
      }
      return true;
    });
  }, [sorted, filterPartner, filterOpponent, mode]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Auto-expand and scroll to selected session
  useEffect(() => {
    if (!selectedSessionId) return;
    setExpandedIds((prev) => new Set(prev).add(selectedSessionId));

    const idx = filtered.findIndex((s) => s.activity.id === selectedSessionId);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount(idx + 5);
    }

    requestAnimationFrame(() => {
      const el = cardRefs.current.get(selectedSessionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [selectedSessionId, filtered, visibleCount]);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterPartner, filterOpponent]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isFiltered = !!filterPartner || !!filterOpponent;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Session Cards</h3>
        {isFiltered && (
          <button
            onClick={onClearFilter}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Clear filter: {filterPartner ? `Partner: ${filterPartner}` : `Opponent: ${filterOpponent}`}
          </button>
        )}
      </div>

      <div className="space-y-0">
        {visible.map((s) => {
          const isExpanded = expandedIds.has(s.activity.id);
          const isSelected = s.activity.id === selectedSessionId;
          // Mode-aware stats for header
          const stats = getSessionStats(s, mode);
          // All games for expanded detail (always show everything)
          const allGames = getAllGames(s.parsed);
          const catConfig = CATEGORY_LABELS[s.category] ?? CATEGORY_LABELS.badminton_casual;

          return (
            <div
              key={s.activity.id}
              ref={(el) => {
                if (el) cardRefs.current.set(s.activity.id, el);
              }}
              className={`border-b border-muted/50 last:border-b-0 ${
                isSelected ? "bg-primary/5 ring-1 ring-primary/20 rounded" : ""
              }`}
            >
              {/* Collapsed row - mode-aware stats */}
              <button
                onClick={() => toggleExpand(s.activity.id)}
                className="w-full text-left py-3 px-2 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <span className="text-[10px] text-muted-foreground w-16 shrink-0 font-mono">
                  {new Date(s.activity.start_date_local).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: catConfig.color + "20", color: catConfig.color }}
                >
                  {catConfig.label}
                </span>
                <span className="text-xs font-medium truncate flex-1 min-w-0">
                  {s.activity.name}
                </span>
                <span className="text-xs font-mono shrink-0">
                  <span className="text-green-600">{stats.wins}W</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-red-500">{stats.losses}L</span>
                </span>
                <span className="text-xs font-mono font-semibold w-10 text-right shrink-0">
                  <span className={stats.winPct >= 50 ? "text-green-600" : "text-red-500"}>
                    {stats.winPct}%
                  </span>
                </span>
                {s.activity.average_heartrate && (
                  <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0 hidden sm:block">
                    {Math.round(s.activity.average_heartrate)} bpm
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded detail - always shows ALL games */}
              {isExpanded && (
                <div className="px-2 pb-3 ml-16">
                  {/* Comment */}
                  {s.parsed.comment && (
                    <p className="text-xs text-muted-foreground italic mb-2">
                      {s.parsed.comment}
                    </p>
                  )}

                  {/* Game list */}
                  {allGames.length > 0 && (
                    <div className="mb-3">
                      <table className="w-full text-[11px]">
                        <tbody>
                          {allGames.map((g, i) => (
                            <tr
                              key={i}
                              className={`border-b border-muted/30 last:border-b-0 ${
                                g.isFriendly ? "opacity-70" : ""
                              }`}
                            >
                              <td className="py-1 w-5">
                                <span
                                  className={`font-bold ${
                                    g.result === "W" ? "text-green-600" : "text-red-500"
                                  }`}
                                >
                                  {g.result}
                                </span>
                              </td>
                              <td className="py-1 font-mono w-12">{g.score}</td>
                              <td className="py-1 text-muted-foreground">
                                w/ <span className="text-foreground">{g.partner}</span>
                                {" vs "}
                                <span className="text-foreground">{g.opponents.join(" + ")}</span>
                              </td>
                              {g.isFriendly && (
                                <td className="py-1 text-[9px] text-muted-foreground italic">
                                  friendly
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Metrics row */}
                  <div className="flex gap-4 flex-wrap text-[10px] mb-2">
                    <MetricPill label="Duration" value={formatDuration(s.activity.elapsed_time)} />
                    {s.activity.calories > 0 && (
                      <MetricPill label="Calories" value={`${Math.round(s.activity.calories)}`} />
                    )}
                    {s.activity.average_heartrate && (
                      <MetricPill label="Avg HR" value={`${Math.round(s.activity.average_heartrate)}`} />
                    )}
                    {s.activity.max_heartrate && (
                      <MetricPill label="Max HR" value={`${Math.round(s.activity.max_heartrate)}`} />
                    )}
                  </div>

                  {/* HR Zones */}
                  {s.activity.hr_zones && (
                    <div className="mb-2">
                      <div className="space-y-1">
                        {HR_ZONE_LABELS.map((zone) => {
                          const data = s.activity.hr_zones?.[zone.key];
                          if (!data || data.seconds === 0) return null;
                          const totalSecs = Object.values(s.activity.hr_zones!)
                            .reduce((sum, z) => sum + (z?.seconds || 0), 0);
                          const pct = totalSecs > 0 ? (data.seconds / totalSecs) * 100 : 0;
                          return (
                            <div key={zone.key} className="flex items-center gap-2">
                              <span className="text-[9px] font-bold w-5 text-muted-foreground">
                                {zone.label}
                              </span>
                              <div className="flex-1 h-3 bg-muted relative overflow-hidden rounded-sm">
                                <div
                                  className="h-full"
                                  style={{ width: `${pct}%`, backgroundColor: zone.color }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground w-12 text-right font-mono">
                                {formatZoneTime(data.seconds)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Strava link */}
                  <a
                    href={`https://www.strava.com/activities/${s.activity.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Strava
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-3 mt-2 border border-muted rounded text-[10px] text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          Load more ({Math.min(filtered.length - visibleCount, PAGE_SIZE)} of{" "}
          {filtered.length - visibleCount} remaining)
        </button>
      )}

      {filtered.length === 0 && (
        <div className="py-8 text-center text-muted-foreground text-xs">
          No sessions match the current filter.
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
