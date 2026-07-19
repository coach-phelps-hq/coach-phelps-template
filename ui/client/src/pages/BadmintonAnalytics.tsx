import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { HelpCircle } from "lucide-react";
import activitiesData from "@/data/activities.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import type { ChallengeV2 } from "@/lib/challenge";
import { Activity, getTrainingCategory, computeSleepStreak } from "@/lib/activities";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CommandStrip } from "@/components/CommandStrip";
import { StatBox } from "@/components/badminton-analytics/StatBox";
import { WeeklyLoadChart } from "@/components/badminton-analytics/WeeklyLoadChart";
import { HrZoneChart } from "@/components/badminton-analytics/HrZoneChart";
import { LoadTrendChart } from "@/components/badminton-analytics/LoadTrendChart";
import { AvgHrTrendChart } from "@/components/badminton-analytics/AvgHrTrendChart";
import { DurationHrScatter } from "@/components/badminton-analytics/DurationHrScatter";
import { FitnessFatigueChart } from "@/components/badminton-analytics/FitnessFatigueChart";
import { LoadStatus } from "@/components/badminton-analytics/LoadStatus";
import { SessionList } from "@/components/badminton-analytics/SessionList";
import { computeSessionTrimp, rollingAvgTrimp } from "@/components/badminton-analytics/shared";

const activitiesRaw = activitiesData as Activity[];
const challengeData = challengeDataRaw as unknown as ChallengeV2;

export default function BadmintonAnalytics() {
  const sleepQuest = challengeData.quests.find((q) => q.id === "sleep");
  const sleepStreak = useMemo(
    () => computeSleepStreak(sleepQuest?.completed_dates ?? []),
    [sleepQuest],
  );

  const BADMINTON_CATS = new Set([
    "badminton_ranked", "badminton_league", "badminton_friendly", "badminton_casual",
  ]);
  const sessions = useMemo(
    () => activitiesRaw.filter((a) => BADMINTON_CATS.has(getTrainingCategory(a))),
    [],
  );

  const search = useSearch();
  const [, setLocation] = useLocation();
  const selectedSessionId = useMemo(() => {
    const id = new URLSearchParams(search).get("session");
    return id ? Number(id) : null;
  }, [search]);

  const handleSessionClick = useCallback(
    (id: number) => {
      const params = new URLSearchParams(search);
      params.set("session", String(id));
      setLocation(`/badminton?${params.toString()}`, { replace: true });
    },
    [search, setLocation],
  );

  const totalLoad = useMemo(() => sessions.reduce((s, a) => s + computeSessionTrimp(a), 0), [sessions]);
  const avgLoad = sessions.length > 0 ? Math.round(totalLoad / sessions.length) : 0;
  const rollingAvgTrimpVal = useMemo(() => rollingAvgTrimp(sessions), [sessions]);

  const { sessionsThisYear, yearDelta, lastYearShort } = useMemo(() => {
    const today = new Date();
    const thisYear = today.getFullYear();
    const dayOfYear = (d: Date) =>
      Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000);
    const todayDayOfYear = dayOfYear(today);

    const thisYearCount = sessions.filter((a) => {
      const d = new Date(a.start_date);
      return d.getFullYear() === thisYear;
    }).length;
    const lastYearCount = sessions.filter((a) => {
      const d = new Date(a.start_date);
      return d.getFullYear() === thisYear - 1 && dayOfYear(d) <= todayDayOfYear;
    }).length;

    return {
      sessionsThisYear: thisYearCount,
      yearDelta: thisYearCount - lastYearCount,
      lastYearShort: String(thisYear - 1).slice(-2),
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-background">
      <CommandStrip challengeData={challengeData} sleepStreak={sleepStreak} syncStatus={syncStatusData} showBack />
      <div className="border-b-2 border-foreground" />

      <div className="container py-6 px-4 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Badminton Analytics</h2>
            <p className="text-xs text-muted-foreground mt-1">{sessions.length} sessions in history</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                aria-label="What is TRIMP?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[280px] space-y-1.5">
              <p>
                <span className="font-bold">TRIMP</span> (Training Impulse) = minutes spent in each HR
                zone × that zone's weight (Z1=1x, Z2=2x, Z3=3x, Z4=4x, Z5=5x), summed across the session.
              </p>
              <p className="font-mono opacity-80">
                e.g. 20 min in Z2 (120-140bpm, ×2) + 15 min in Z4 (161-180bpm, ×4)
                <br />
                = 40 + 60 = <span className="font-bold opacity-100">100 TRIMP</span>
              </p>
              <p>Time spent in higher zones counts for more than the same time in lower zones.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox
            label="Sessions This Year"
            value={`${sessionsThisYear}`}
            inlineSub={`${yearDelta >= 0 ? "+" : ""}${yearDelta} vs '${lastYearShort} YTD`}
          />
          <StatBox
            label="Total Training Load"
            value={`${totalLoad} TRIMP`}
          />
          <StatBox
            label="Avg Load / Session"
            value={`${avgLoad} TRIMP`}
          />
          <LoadStatus sessions={sessions} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
          <WeeklyLoadChart sessions={sessions} />
          <HrZoneChart sessions={sessions} />
          <LoadTrendChart sessions={sessions} onSessionClick={handleSessionClick} />
          <AvgHrTrendChart sessions={sessions} />
          <DurationHrScatter sessions={sessions} onSessionClick={handleSessionClick} />
          <FitnessFatigueChart sessions={sessions} />
        </div>

        {/* Session history */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Session History
          </h3>
          <SessionList sessions={sessions} selectedSessionId={selectedSessionId} rollingAvgTrimp={rollingAvgTrimpVal} />
        </div>
      </div>
    </div>
  );
}
