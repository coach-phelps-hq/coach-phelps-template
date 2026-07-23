import { LoginPage } from "@/components/login/LoginPage";
import { adaptCurrentWeek } from "@/components/home-warm/currentWeekAdapter";
import activitiesData from "@/data/activities.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import currentWeekRaw from "@/data/current_week.json";
import type { Activity } from "@/lib/activities";
import type { ChallengeV2 } from "@/lib/challenge";
import type { SyncStatusPayload } from "@/components/home-warm/warmHomeModel";
import { parseCurrentWeek } from "@/lib/currentWeek";

// There's no session yet at this point (this page is shown before sign-in), so this can
// never be the viewing user's own live data - the hero is decorative chrome on a pre-auth
// screen, not a real dashboard, so bundled fixture data is intentional here.
const activities = activitiesData as Activity[];
const challengeData = challengeDataRaw as unknown as ChallengeV2;
const syncStatus = syncStatusData as SyncStatusPayload;

const currentWeekRt = parseCurrentWeek(currentWeekRaw);
const currentWeek =
  currentWeekRt.availability.available && currentWeekRt.data
    ? adaptCurrentWeek(currentWeekRt.data, currentWeekRt.availability, activities)
    : undefined;

export default function Login() {
  return (
    <LoginPage
      activities={activities}
      challengeData={challengeData}
      currentWeek={currentWeek}
      syncStatus={syncStatus}
    />
  );
}
