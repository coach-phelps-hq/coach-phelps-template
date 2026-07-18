import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, formatDistance, HR_ZONE_LABELS, parseLocal } from "@/lib/activities";
import { paceSecPerKm, formatPace } from "./shared";

const PAGE_SIZE = 8;

function isPR(run: Activity): boolean {
  return !!run.best_efforts?.some((e) => e.pr_rank === 1);
}

function RunRow({
  run,
  expanded,
  fasterThanUsual,
  onToggle,
}: {
  run: Activity;
  expanded: boolean;
  fasterThanUsual: boolean;
  onToggle: () => void;
}) {
  const d = parseLocal(run.start_date_local);
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const pace = paceSecPerKm(run);
  const pr = isPR(run);

  const durationMins = Math.floor(run.moving_time / 60);
  const durationSecs = run.moving_time % 60;

  return (
    <div className="border-2 border-foreground">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors"
      >
        <div>
          <div className="text-[10px] font-mono text-muted-foreground">{dateStr}</div>
          <div className="text-sm font-bold mt-0.5">
            {run.name}
            {pr && (
              <span className="ml-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#c44020" }}>
                PR
              </span>
            )}
          </div>
          {pace && (
            <div className="text-[10px] font-mono mt-1" style={{ color: fasterThanUsual ? "#22c55e" : undefined }}>
              {formatPace(pace)}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-mono font-black leading-none" style={{ color: "#c44020" }}>
            {formatDistance(run.distance)}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
            <span>
              {durationMins}:{durationSecs.toString().padStart(2, "0")} moving
            </span>
            {pace && <span>{formatPace(pace)}</span>}
            {run.average_heartrate && <span>Avg {Math.round(run.average_heartrate)} bpm</span>}
          </div>

          {run.hr_zones && (
            <div className="flex h-1.5 mt-3 overflow-hidden gap-px">
              {HR_ZONE_LABELS.map((zone) => {
                const secs = run.hr_zones![zone.key]?.seconds ?? 0;
                const total = Object.values(run.hr_zones!).reduce((s, z) => s + z.seconds, 0);
                const pct = total > 0 ? (secs / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={zone.key}
                    style={{ width: `${pct}%`, backgroundColor: zone.color, flexShrink: 0 }}
                    title={`${zone.label}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RunSessionList({
  runs,
  selectedRunId,
  rollingAvgPaceSec,
}: {
  runs: Activity[];
  selectedRunId?: number | null;
  rollingAvgPaceSec: number | null;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const visible = useMemo(() => runs.slice(0, visibleCount), [runs, visibleCount]);
  const hasMore = visibleCount < runs.length;

  useEffect(() => {
    if (!selectedRunId) return;

    setExpandedIds((prev) => new Set(prev).add(selectedRunId));

    const idx = runs.findIndex((r) => r.id === selectedRunId);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount(idx + PAGE_SIZE / 2);
    }

    requestAnimationFrame(() => {
      const el = cardRefs.current.get(selectedRunId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRunId]);

  function toggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No runs yet. First one is the hardest.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {visible.map((run) => (
          <div key={run.id} ref={(el) => { if (el) cardRefs.current.set(run.id, el); }}>
            <RunRow
              run={run}
              expanded={expandedIds.has(run.id)}
              fasterThanUsual={
                rollingAvgPaceSec !== null && !!paceSecPerKm(run) && paceSecPerKm(run)! < rollingAvgPaceSec
              }
              onToggle={() => toggle(run.id)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="flex-1 border-2 border-foreground p-3 text-xs font-bold uppercase tracking-wider hover:bg-muted/30 transition-colors"
          >
            Show {Math.min(PAGE_SIZE, runs.length - visibleCount)} more ({runs.length - visibleCount} remaining)
          </button>
        )}
        {visibleCount > PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setVisibleCount(PAGE_SIZE)}
            className="flex-1 border-2 border-foreground p-3 text-xs font-bold uppercase tracking-wider hover:bg-muted/30 transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
