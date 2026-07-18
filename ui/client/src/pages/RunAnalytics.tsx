import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import activitiesData from "@/data/activities.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import type { ChallengeV2 } from "@/lib/challenge";
import { Activity, getTrainingCategory, computeSleepStreak, formatDistance } from "@/lib/activities";
import { CommandStrip } from "@/components/CommandStrip";
import { StatBox } from "@/components/run-analytics/StatBox";
import { WeeklyDistanceChart } from "@/components/run-analytics/WeeklyDistanceChart";
import { PaceTrendChart } from "@/components/run-analytics/PaceTrendChart";
import { CadenceTrendChart } from "@/components/run-analytics/CadenceTrendChart";
import { HrZoneChart } from "@/components/run-analytics/HrZoneChart";
import { PersonalBestsTable } from "@/components/run-analytics/PersonalBestsTable";
import { FormIndicator } from "@/components/run-analytics/FormIndicator";
import { HrVsPaceCorrelation } from "@/components/run-analytics/HrVsPaceCorrelation";
import { RunSessionList } from "@/components/run-analytics/RunSessionList";
import { paceSecPerKm, formatPace, rollingAvgPace } from "@/components/run-analytics/shared";

const activitiesRaw = activitiesData as Activity[];
const challengeData = challengeDataRaw as unknown as ChallengeV2;

export default function RunAnalytics() {
  const sleepQuest = challengeData.quests.find((q) => q.id === "sleep");
  const sleepStreak = useMemo(
    () => computeSleepStreak(sleepQuest?.completed_dates ?? []),
    [sleepQuest],
  );

  const runs = useMemo(
    () => activitiesRaw.filter((a) => getTrainingCategory(a) === "run"),
    [],
  );

  const search = useSearch();
  const [, setLocation] = useLocation();
  const selectedRunId = useMemo(() => {
    const id = new URLSearchParams(search).get("run");
    return id ? Number(id) : null;
  }, [search]);

  const handleRunClick = useCallback(
    (id: number) => {
      const params = new URLSearchParams(search);
      params.set("run", String(id));
      setLocation(`/analytics?${params.toString()}`, { replace: true });
    },
    [search, setLocation],
  );

  const totalDistanceKm = (runs.reduce((s, a) => s + (a.distance ?? 0), 0) / 1000).toFixed(1);

  const avgPace = useMemo(() => {
    const withPace = runs.filter((a) => a.distance && a.moving_time);
    if (!withPace.length) return null;
    const avg = withPace.reduce((s, a) => s + paceSecPerKm(a)!, 0) / withPace.length;
    return formatPace(avg);
  }, [runs]);

  const longestRun = useMemo(() => {
    return runs.reduce<Activity | null>((best, r) => {
      if (!best || (r.distance ?? 0) > (best.distance ?? 0)) return r;
      return best;
    }, null);
  }, [runs]);

  const rollingAvgPaceSec = useMemo(() => rollingAvgPace(runs), [runs]);

  return (
    <div className="min-h-screen bg-background">
      <CommandStrip challengeData={challengeData} sleepStreak={sleepStreak} syncStatus={syncStatusData} showBack />
      <div className="border-b-2 border-foreground" />

      <div className="container py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight">Run Analytics</h2>
          <p className="text-xs text-muted-foreground mt-1">{runs.length} total runs in history</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox
            label="Total Distance"
            value={`${totalDistanceKm} km`}
            sub={`${runs.length} runs`}
          />
          {avgPace && (
            <StatBox
              label="Avg Pace (all time)"
              value={avgPace}
              sub="moving time"
            />
          )}
          {longestRun && (
            <StatBox
              label="Longest Run"
              value={formatDistance(longestRun.distance)}
              sub={paceSecPerKm(longestRun) ? formatPace(paceSecPerKm(longestRun)!) : undefined}
            />
          )}
          <FormIndicator runs={runs} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
          <WeeklyDistanceChart runs={runs} />
          <HrZoneChart runs={runs} />
          <PaceTrendChart runs={runs} onRunClick={handleRunClick} />
          <CadenceTrendChart runs={runs} />
          <HrVsPaceCorrelation runs={runs} onRunClick={handleRunClick} />
          <PersonalBestsTable runs={runs} />
        </div>

        {/* Run history */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Run History
          </h3>
          <RunSessionList runs={runs} selectedRunId={selectedRunId} rollingAvgPaceSec={rollingAvgPaceSec} />
        </div>
      </div>
    </div>
  );
}
