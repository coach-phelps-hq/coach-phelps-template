import { Activity, HR_ZONE_LABELS } from "@/lib/activities";

// Edwards' TRIMP: minutes in each HR zone weighted by zone index (Z1=1 ... Z5=5), summed.
// https://fellrnr.com/wiki/TRIMP
export function computeSessionTrimp(session: Activity): number {
  if (!session.hr_zones) return 0;
  let trimp = 0;
  HR_ZONE_LABELS.forEach((zone, i) => {
    const weight = i + 1;
    const minutes = (session.hr_zones![zone.key]?.seconds ?? 0) / 60;
    trimp += minutes * weight;
  });
  return Math.round(trimp);
}

// Rolling average TRIMP, used to highlight harder-than-usual sessions.
export function rollingAvgTrimp(sessions: Activity[], count = 20): number | null {
  const loads = sessions.slice(0, count).map(computeSessionTrimp).filter((t) => t > 0);
  if (loads.length === 0) return null;
  return loads.reduce((s, v) => s + v, 0) / loads.length;
}

export type AcwrStatus = "spike" | "building" | "steady" | "detraining" | "insufficient-data";

// Acute:Chronic Workload Ratio - acute = last 7 days' load, chronic = avg weekly load over last 28 days.
// Sessions assumed newest-first. Standard "sweet spot" is ~0.8-1.3; above ~1.5 flags spike/injury risk.
export function computeAcwr(sessions: Activity[]): { ratio: number | null; status: AcwrStatus } {
  if (sessions.length === 0) return { ratio: null, status: "insufficient-data" };

  const now = new Date(sessions[0].start_date_local.replace(/Z$/, ""));
  const dayMs = 24 * 60 * 60 * 1000;
  const earliestDate = new Date(sessions[sessions.length - 1].start_date_local.replace(/Z$/, ""));
  const spanDays = (now.getTime() - earliestDate.getTime()) / dayMs;

  // Must match the 28-day chronic window below - a shorter threshold would let
  // chronic28d be built from a partial window while still dividing by a flat 4.
  if (spanDays < 28) return { ratio: null, status: "insufficient-data" };

  let acute = 0;
  let chronic28d = 0;
  for (const s of sessions) {
    const d = new Date(s.start_date_local.replace(/Z$/, ""));
    const daysAgo = (now.getTime() - d.getTime()) / dayMs;
    const trimp = computeSessionTrimp(s);
    if (daysAgo <= 7) acute += trimp;
    if (daysAgo <= 28) chronic28d += trimp;
  }

  const chronicWeekly = chronic28d / 4;
  if (chronicWeekly === 0) {
    return { ratio: null, status: acute > 0 ? "building" : "insufficient-data" };
  }

  const ratio = acute / chronicWeekly;
  let status: AcwrStatus;
  if (ratio > 1.5) status = "spike";
  else if (ratio > 1.3) status = "building";
  else if (ratio >= 0.8) status = "steady";
  else status = "detraining";

  return { ratio, status };
}

// Weekly fitness/fatigue series: fatigue = that week's TRIMP total (acute),
// fitness = trailing 4-week average of weekly TRIMP ending at that week (chronic).
// Same methodology as computeAcwr, shown as a time series instead of a single snapshot.
export function computeWeeklyFitnessFatigue(
  weeks: { weekKey: string; activities: Activity[] }[],
): { weekKey: string; fatigue: number; fitness: number }[] {
  const weeklyLoads = weeks.map((w) => w.activities.reduce((s, a) => s + computeSessionTrimp(a), 0));

  return weeks.map((w, i) => {
    const windowStart = Math.max(0, i - 3);
    const window = weeklyLoads.slice(windowStart, i + 1);
    const fitness = window.reduce((s, v) => s + v, 0) / window.length;
    return { weekKey: w.weekKey, fatigue: weeklyLoads[i], fitness: Math.round(fitness) };
  });
}
