/**
 * SportSpine — session ledger + sport-specific activity heatmap.
 */
import { useMemo } from "react";
import type { ChallengeV2 } from "@/lib/challenge";
import type { Activity } from "@/lib/activities";
import type { CurrentWeekContract } from "@/components/home-warm/currentWeek.fixture";
import { buildLiveWeekContract } from "@/components/home-warm/liveWeekContract";
import { buildWarmHomeModel, type SyncStatusPayload } from "@/components/home-warm/warmHomeModel";
import { buildActivityEvidenceSnapshots, buildRecentSessions } from "@/components/home-warm/WarmInstrumentHome";
import { RecentSessionsCard } from "@/components/home-warm/WarmInstrumentWidgets";
import type { WarmSportId } from "@/components/home-warm/WarmInstrumentWidgets";
import { buildBadmintonActivityHeatmap } from "./badmintonLensModel";
import { BadmintonActivityHeatmapCard } from "./BadmintonLensWidgets";
import { buildCalisthenicsActivityHeatmap } from "./calisthenicsLensModel";
import { CalisthenicsActivityHeatmapCard } from "./CalisthenicsLensWidgets";
import { buildRunningActivityHeatmap } from "./runningLensModel";
import { RunningActivityHeatmapCard } from "./RunningLensWidgets";

interface SportSpineProps {
  sport: WarmSportId;
  activities: Activity[];
  challengeData: ChallengeV2;
  syncStatus: SyncStatusPayload;
  currentWeek?: CurrentWeekContract;
}

export function SportSpine({ sport, activities, challengeData, syncStatus, currentWeek }: SportSpineProps) {
  const snapshots = useMemo(() => {
    const effectiveWeek = currentWeek ?? buildLiveWeekContract(activities, challengeData);
    buildWarmHomeModel(activities, challengeData, syncStatus, effectiveWeek);
    const activityEvidence = buildActivityEvidenceSnapshots(activities);
    const filteredEvidence = activityEvidence.filter((activity) => activity.sport === sport);
    return {
      sessions: buildRecentSessions(filteredEvidence),
      badmintonHeatmap: buildBadmintonActivityHeatmap(activities),
      runningHeatmap: buildRunningActivityHeatmap(activities),
      calisthenicsHeatmap: buildCalisthenicsActivityHeatmap(activities),
    };
  }, [activities, challengeData, currentWeek, sport, syncStatus]);

  const heatmap =
    sport === "badminton" ? (
      <BadmintonActivityHeatmapCard heatmap={snapshots.badmintonHeatmap} />
    ) : sport === "calisthenics" ? (
      <CalisthenicsActivityHeatmapCard heatmap={snapshots.calisthenicsHeatmap} />
    ) : (
      <RunningActivityHeatmapCard heatmap={snapshots.runningHeatmap} />
    );

  return (
    <section className="sa-spine" aria-label="Shared training spine">
      <span className="sa-spine__label">SPINE — RECENT SESSIONS & CONSISTENCY</span>
      <div className="sa-spine__grid">
        <RecentSessionsCard sessions={snapshots.sessions} />
        {heatmap}
      </div>
    </section>
  );
}
