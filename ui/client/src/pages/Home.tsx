/**
 * Athlete OS — Coach Phelps HQ (v3)
 * Neo-brutalist dashboard: category-based summary cards, stacked volume,
 * training category heatmap, side quest tracker, streak counters.
 * Data: activities.json + challenge_v2.json (single source of truth).
 */
import { useState, useMemo } from "react";
import activitiesData from "@/data/activities.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import type { ChallengeV2 } from "@/lib/challenge";
import {
  Activity,
  getSportGroup,
  DISPLAY_SPORT_TYPES,
  computeSleepStreak,
  parseLocal,
} from "@/lib/activities";
import { CommandStrip } from "@/components/CommandStrip";
import { MissionBanner } from "@/components/MissionBanner";
import { SyncStatusBanner } from "@/components/SyncStatusCard";
import { WeeklySummaryCards } from "@/components/WeeklySummaryCards";
import { VolumeTrend } from "@/components/VolumeTrend";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { SideQuestTracker } from "@/components/SideQuestTracker";
import { ActivityFeed } from "@/components/ActivityFeed";

const activities = activitiesData as Activity[];
const challengeData = challengeDataRaw as unknown as ChallengeV2;

export default function Home() {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (sportFilter !== "all") {
      filtered = filtered.filter((a) => getSportGroup(a.sport_type) === sportFilter);
    }

    if (timeFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (timeFilter) {
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      filtered = filtered.filter((a) => parseLocal(a.start_date_local) >= cutoff);
    }

    return filtered;
  }, [sportFilter, timeFilter]);

  const sportTypes = useMemo(() => {
    return [...DISPLAY_SPORT_TYPES];
  }, []);

  const sleepQuest = challengeData.quests.find((q) => q.id === "sleep");
  const sleepStreak = useMemo(
    () => computeSleepStreak(sleepQuest?.completed_dates ?? []),
    [sleepQuest],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Command Strip — top bar with streaks + sync button (tooltip shows last sync) */}
      <CommandStrip challengeData={challengeData} sleepStreak={sleepStreak} syncStatus={syncStatusData} />

      {/* Sync warning/error banner — only renders when status is partial or error */}
      <SyncStatusBanner syncStatus={syncStatusData} />

      {/* Mission banner — days to event, run progress, pace */}
      <MissionBanner
        mainQuest={challengeData.main_quest}
        activities={activities}
        challengeStartDate={challengeData.challenge.start_date}
      />

      {/* Divider */}
      <div className="border-b-2 border-foreground" />

      {/* Weekly Summary Cards */}
      <WeeklySummaryCards
        activities={activities}
        weeklyTargets={challengeData.weekly_targets}
      />

      {/* Volume Trend + HR Trend */}
      <VolumeTrend activities={activities} />

      {/* Activity Heatmap (category-colored) */}
      <ActivityHeatmap activities={activities} />

      {/* Divider */}
      <div className="border-b-2 border-foreground" />

      {/* Main content: side quests + feed */}
      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Side Quest Tracker */}
          <div className="lg:w-64 shrink-0">
            <SideQuestTracker
              activities={activities}
              challengeData={challengeData}
            />
          </div>

          {/* Right: Activity Feed */}
          <div className="flex-1">
            <ActivityFeed
              activities={filteredActivities}
              sportFilter={sportFilter}
              setSportFilter={setSportFilter}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              sportTypes={sportTypes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
