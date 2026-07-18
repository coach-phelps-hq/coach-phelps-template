import { Activity } from "@/lib/activities";

export function paceSecPerKm(activity: Activity): number | null {
  if (!activity.distance || !activity.moving_time) return null;
  return activity.moving_time / (activity.distance / 1000);
}

export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export type FormTrend = "up" | "down" | "flat";

// Compares the last 5 runs' avg pace against the 5 before that — positive delta means faster.
export function computeForm(runs: Activity[]): FormTrend {
  // runs are assumed newest-first, same ordering as the rest of the page
  const paces = runs
    .slice(0, 10)
    .map(paceSecPerKm)
    .filter((p): p is number => p !== null);

  if (paces.length < 6) return "flat";

  const recent = paces.slice(0, 5);
  const prior = paces.slice(5, 10);
  if (prior.length === 0) return "flat";

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const recentAvg = avg(recent);
  const priorAvg = avg(prior);

  const delta = (priorAvg - recentAvg) / priorAvg; // positive = getting faster
  if (delta > 0.02) return "up";
  if (delta < -0.02) return "down";
  return "flat";
}

// Rolling-20 average pace, used to highlight faster-than-usual runs.
export function rollingAvgPace(runs: Activity[], count = 20): number | null {
  const paces = runs.slice(0, count).map(paceSecPerKm).filter((p): p is number => p !== null);
  if (paces.length === 0) return null;
  return paces.reduce((s, v) => s + v, 0) / paces.length;
}
