/**
 * Analytics - Match performance insights page.
 * Loads activities, parses match descriptions, filters by mode (ranked/all).
 * Cross-widget linking via URL params: ?mode, ?partner, ?opponent, ?session.
 *
 * Bug 1 fix: AnalyticsSession now carries both `parsed` (all games) and
 * `ranked*` fields (ranked-only stats). Widgets receive a `getGames` helper
 * that returns the correct game set for the active mode.
 */
import { useMemo, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import activitiesData from "@/data/activities.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import type { ChallengeV2 } from "@/lib/challenge";
import { Activity, getTrainingCategory, computeSleepStreak } from "@/lib/activities";
import { parseMatch, getAllGames, getRankedGames, type ParsedMatch, type ParsedGame } from "@/lib/matchParser";
import { CommandStrip } from "@/components/CommandStrip";
import { GameFilter, type GameMode } from "@/components/badminton-match-analytics/GameFilter";
import { SummaryBanner } from "@/components/badminton-match-analytics/SummaryBanner";
import { WinRateTrend } from "@/components/badminton-match-analytics/WinRateTrend";
import { FatigueCurve } from "@/components/badminton-match-analytics/FatigueCurve";
import { PartnerStats } from "@/components/badminton-match-analytics/PartnerStats";
import { OpponentStats } from "@/components/badminton-match-analytics/OpponentStats";
import { ScoreDistribution } from "@/components/badminton-match-analytics/ScoreDistribution";
import { HrVsWinRate } from "@/components/badminton-match-analytics/HrVsWinRate";
import { SessionCards } from "@/components/badminton-match-analytics/SessionCards";

const activities = activitiesData as (Activity & { ebadders?: any })[];
const challengeData = challengeDataRaw as unknown as ChallengeV2;

export interface AnalyticsSession {
  activity: Activity & { ebadders?: any };
  parsed: ParsedMatch;
  /** Ranked-only stats (excludes friendlies section) */
  rankedWins: number;
  rankedLosses: number;
  rankedWinPct: number;
  rankedGames: ParsedGame[];
  category: ReturnType<typeof getTrainingCategory>;
}

/** Return the correct game set for the active mode */
export function getSessionGames(s: AnalyticsSession, mode: GameMode): ParsedGame[] {
  return mode === "ranked" ? s.rankedGames : getAllGames(s.parsed);
}

/** Return mode-appropriate W/L/winPct for a session */
export function getSessionStats(s: AnalyticsSession, mode: GameMode) {
  if (mode === "ranked") {
    return { wins: s.rankedWins, losses: s.rankedLosses, winPct: s.rankedWinPct };
  }
  return { wins: s.parsed.wins, losses: s.parsed.losses, winPct: s.parsed.winPct };
}

const RANKED_CATEGORIES = new Set(["badminton_ranked", "badminton_league"]);
const ALL_CATEGORIES = new Set(["badminton_ranked", "badminton_league", "badminton_friendly", "badminton_casual"]);

export default function BadmintonMatchAnalytics() {
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(search);
  const mode: GameMode = params.get("mode") === "ranked" ? "ranked" : "all";
  const filterPartner = params.get("partner") || null;
  const filterOpponent = params.get("opponent") || null;
  const selectedSessionId = params.get("session") ? Number(params.get("session")) : null;

  // Build URL with updated params
  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(search);
      for (const [key, val] of Object.entries(updates)) {
        if (val === null) p.delete(key);
        else p.set(key, val);
      }
      return `/badminton-match-analytics?${p.toString()}`;
    },
    [search],
  );

  const setMode = useCallback(
    (m: GameMode) => {
      setLocation(buildUrl({ mode: m, partner: null, opponent: null, session: null }), { replace: true });
    },
    [setLocation, buildUrl],
  );

  // Parse all badminton activities with match data
  const allSessions: AnalyticsSession[] = useMemo(() => {
    const result: AnalyticsSession[] = [];
    for (const a of activities) {
      const cat = getTrainingCategory(a);
      if (!ALL_CATEGORIES.has(cat)) continue;
      const parsed = parseMatch(a);
      if (!parsed) continue;

      // Compute ranked-only stats
      const rankedGames = getRankedGames(parsed);
      const rankedWins = rankedGames.filter((g) => g.result === "W").length;
      const rankedLosses = rankedGames.filter((g) => g.result === "L").length;
      const rankedTotal = rankedWins + rankedLosses;

      result.push({
        activity: a,
        parsed,
        rankedWins,
        rankedLosses,
        rankedWinPct: rankedTotal > 0 ? Math.round((rankedWins / rankedTotal) * 100) : 0,
        rankedGames,
        category: cat,
      });
    }
    result.sort(
      (a, b) =>
        new Date(a.activity.start_date_local).getTime() -
        new Date(b.activity.start_date_local).getTime(),
    );
    return result;
  }, []);

  // Filter by mode
  const sessions = useMemo(() => {
    if (mode === "ranked") {
      return allSessions.filter((s) => RANKED_CATEGORIES.has(s.category));
    }
    return allSessions;
  }, [allSessions, mode]);

  const rankedCount = useMemo(
    () => allSessions.filter((s) => RANKED_CATEGORIES.has(s.category)).length,
    [allSessions],
  );

  const totalGames = useMemo(
    () => sessions.reduce((sum, s) => sum + getSessionGames(s, mode).length, 0),
    [sessions, mode],
  );

  const sleepQuest = challengeData.quests.find((q) => q.id === "sleep");
  const sleepStreak = useMemo(
    () => computeSleepStreak(sleepQuest?.completed_dates ?? []),
    [sleepQuest],
  );

  // Cross-widget linking handlers
  const handleSessionClick = useCallback(
    (activityId: number) => {
      setLocation(buildUrl({ session: String(activityId) }), { replace: true });
    },
    [setLocation, buildUrl],
  );

  const handlePartnerClick = useCallback(
    (partner: string) => {
      setLocation(buildUrl({ partner, opponent: null, session: null }), { replace: true });
    },
    [setLocation, buildUrl],
  );

  const handleOpponentClick = useCallback(
    (opponent: string) => {
      setLocation(buildUrl({ opponent, partner: null, session: null }), { replace: true });
    },
    [setLocation, buildUrl],
  );

  const handleClearFilter = useCallback(() => {
    setLocation(buildUrl({ partner: null, opponent: null, session: null }), { replace: true });
  }, [setLocation, buildUrl]);

  return (
    <div className="min-h-screen bg-background">
      <CommandStrip challengeData={challengeData} sleepStreak={sleepStreak} syncStatus={syncStatusData} showBack />
      <div className="border-b-2 border-foreground" />

      <div className="container py-6 px-4 md:px-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Match Analytics</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {sessions.length} sessions &middot; {totalGames} games with match data
            </p>
          </div>
          <GameFilter
            mode={mode}
            onChange={setMode}
            rankedCount={rankedCount}
            allCount={allSessions.length}
          />
        </div>

        {/* Summary Banner - Fix 4 */}
        <SummaryBanner sessions={sessions} mode={mode} />

        {/* Widgets */}
        <div className="space-y-6">
          {/* Win Rate Trend - full width */}
          <WinRateTrend sessions={sessions} mode={mode} onSessionClick={handleSessionClick} />

          {/* Fatigue Curve + Score Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FatigueCurve sessions={sessions} mode={mode} />
            <ScoreDistribution sessions={sessions} mode={mode} />
          </div>

          {/* Partner Stats + Opponent Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PartnerStats sessions={sessions} mode={mode} onPartnerClick={handlePartnerClick} />
            <OpponentStats sessions={sessions} mode={mode} onOpponentClick={handleOpponentClick} />
          </div>

          {/* HR vs Win Rate */}
          <HrVsWinRate sessions={sessions} mode={mode} onSessionClick={handleSessionClick} />

          {/* Session Cards */}
          <SessionCards
            sessions={sessions}
            mode={mode}
            selectedSessionId={selectedSessionId}
            filterPartner={filterPartner}
            filterOpponent={filterOpponent}
            onClearFilter={handleClearFilter}
          />
        </div>
      </div>
    </div>
  );
}
