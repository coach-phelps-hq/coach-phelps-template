/**
 * MissionBanner — Full-width countdown to the season's anchor event.
 * Reads event_date and target from main_quest in challenge_v2.json.
 * Shows: days left, main quest progress vs target (label from unit_label), pace status.
 */
import type { MainQuest } from "@/lib/challenge";
import type { Activity } from "@/lib/activities";
import { getTrainingCategory } from "@/lib/activities";

interface Props {
  mainQuest: MainQuest;
  activities: Activity[];
  challengeStartDate: string;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.max(Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
}

export function MissionBanner({ mainQuest, activities, challengeStartDate }: Props) {
  if (!mainQuest.event_date) return null;

  const daysLeft = daysUntil(mainQuest.event_date);

  const pattern = mainQuest.count_pattern ? new RegExp(mainQuest.count_pattern, "i") : null;
  const completed = activities.filter((a) => {
    if (a.start_date_local.slice(0, 10) < challengeStartDate) return false;
    if (pattern) return pattern.test(a.name);
    return getTrainingCategory(a) === "run";
  }).length;

  const target = mainQuest.target;
  const remaining = Math.max(target - completed, 0);

  // Pace assessment
  const weeksLeft = Math.max(daysLeft / 7, 0.1);
  const neededPerWeek = (remaining / weeksLeft).toFixed(1);
  const onTrack = completed / target >= (1 - daysLeft / 38); // rough pace check

  const statusColor = daysLeft <= 7 ? "#FF4D00" : onTrack ? "#22c55e" : "#f59e0b";

  return (
    <div className="border-b-2 border-foreground bg-foreground text-background">
      <div className="container py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Countdown */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black leading-none" style={{ color: statusColor }}>
              {daysLeft}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-background/50">
              days to {mainQuest.name}
            </span>
          </div>

          {/* Divider */}
          <span className="text-background/20 hidden sm:block">│</span>

          {/* Main quest progress */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono font-bold">
              {completed}/{target}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-background/50">
              {mainQuest.unit_label ?? "runs"} complete
            </span>
          </div>

          {/* Divider */}
          <span className="text-background/20 hidden sm:block">│</span>

          {/* Pace */}
          <div className="text-[10px] font-mono" style={{ color: statusColor }}>
            {remaining > 0 ? `${neededPerWeek}/wk needed` : "goal reached"}
          </div>
        </div>
      </div>
    </div>
  );
}