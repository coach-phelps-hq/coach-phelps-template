import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, formatDuration, HR_ZONE_LABELS, parseLocal } from "@/lib/activities";
import { computeSessionTrimp } from "./shared";

const PAGE_SIZE = 8;

function SessionRow({
  session,
  expanded,
  harderThanUsual,
  onToggle,
}: {
  session: Activity;
  expanded: boolean;
  harderThanUsual: boolean;
  onToggle: () => void;
}) {
  const d = parseLocal(session.start_date_local);
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const load = computeSessionTrimp(session);

  return (
    <div className="border-2 border-foreground">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start justify-between gap-2 hover:bg-muted/30 transition-colors"
      >
        <div>
          <div className="text-[10px] font-mono text-muted-foreground">{dateStr}</div>
          <div className="text-sm font-bold mt-0.5">{session.name}</div>
          {session.average_heartrate && (
            <div className="text-[10px] font-mono mt-1">Avg {Math.round(session.average_heartrate)} bpm</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div
            className="text-lg font-mono font-black leading-none"
            style={{ color: harderThanUsual ? "#22c55e" : undefined }}
          >
            {load} TRIMP
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDuration(session.moving_time)}</div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-muted-foreground">
            <span>{formatDuration(session.moving_time)} moving</span>
            {session.calories > 0 && <span>{Math.round(session.calories)} cal</span>}
            {session.average_heartrate && <span>Avg {Math.round(session.average_heartrate)} bpm</span>}
            <span>{load} TRIMP</span>
          </div>

          {session.hr_zones && (
            <div className="flex h-1.5 mt-3 overflow-hidden gap-px">
              {HR_ZONE_LABELS.map((zone) => {
                const secs = session.hr_zones![zone.key]?.seconds ?? 0;
                const total = Object.values(session.hr_zones!).reduce((s, z) => s + z.seconds, 0);
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

export function SessionList({
  sessions,
  selectedSessionId,
  rollingAvgTrimp,
}: {
  sessions: Activity[];
  selectedSessionId?: number | null;
  rollingAvgTrimp: number | null;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const visible = useMemo(() => sessions.slice(0, visibleCount), [sessions, visibleCount]);
  const hasMore = visibleCount < sessions.length;

  useEffect(() => {
    if (!selectedSessionId) return;

    setExpandedIds((prev) => new Set(prev).add(selectedSessionId));

    const idx = sessions.findIndex((s) => s.id === selectedSessionId);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount(idx + PAGE_SIZE / 2);
    }

    requestAnimationFrame(() => {
      const el = cardRefs.current.get(selectedSessionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  function toggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {visible.map((session) => (
          <div key={session.id} ref={(el) => { if (el) cardRefs.current.set(session.id, el); }}>
            <SessionRow
              session={session}
              expanded={expandedIds.has(session.id)}
              harderThanUsual={
                rollingAvgTrimp !== null && computeSessionTrimp(session) > rollingAvgTrimp
              }
              onToggle={() => toggle(session.id)}
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
            Show {Math.min(PAGE_SIZE, sessions.length - visibleCount)} more ({sessions.length - visibleCount} remaining)
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
