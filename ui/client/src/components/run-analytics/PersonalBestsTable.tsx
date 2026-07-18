import { useMemo } from "react";
import { Activity, parseLocal } from "@/lib/activities";
import { ChartCard } from "./ChartCard";

const BEST_EFFORT_DISTANCES = ["400m", "1K", "1 mile", "5K", "10K"];

function formatEffortTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersonalBestsTable({ runs }: { runs: Activity[] }) {
  const bests = useMemo(() => {
    const map: Record<string, { time: number; date: string; isPR: boolean }> = {};
    const counts: Record<string, number> = {};

    for (const run of runs) {
      if (!run.best_efforts) continue;
      for (const effort of run.best_efforts) {
        if (!BEST_EFFORT_DISTANCES.includes(effort.name)) continue;
        counts[effort.name] = (counts[effort.name] ?? 0) + 1;
        if (effort.pr_rank === 1) {
          map[effort.name] = {
            time: effort.moving_time,
            date: effort.start_date_local,
            isPR: true,
          };
        } else if (!map[effort.name]) {
          map[effort.name] = {
            time: effort.moving_time,
            date: effort.start_date_local,
            isPR: false,
          };
        }
      }
    }

    return BEST_EFFORT_DISTANCES
      .filter((d) => (counts[d] ?? 0) >= 3)
      .map((d) => ({ distance: d, ...map[d] }));
  }, [runs]);

  if (bests.length === 0) return null;

  return (
    <ChartCard title="Personal Bests">
      <div className="divide-y divide-border">
        {bests.map((b) => {
          const d = parseLocal(b.date);
          const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
          return (
            <div key={b.distance} className="flex items-center py-2 first:pt-0 last:pb-0">
              <span className="flex-1 text-left text-[11px] font-mono font-bold">{b.distance}</span>
              <span className="flex-1 text-center text-[13px] font-mono font-black" style={{ color: b.isPR ? "#c44020" : undefined }}>
                {formatEffortTime(b.time)}
              </span>
              <span className="flex-1 text-right text-[10px] font-mono text-muted-foreground">{dateStr}</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
