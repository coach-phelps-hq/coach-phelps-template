import { useMemo } from "react";

interface QuestEntry {
  date: string;
  status: "done" | "missed" | "excused";
}

interface QuestData {
  name: string;
  entries: QuestEntry[];
}

interface QuestHistory {
  generated_at: string;
  quests: Record<string, QuestData>;
}

interface Props {
  questHistory: QuestHistory;
  year: number;
  month: number;
}

function monthRate(entries: QuestEntry[], monthKey: string): number | null {
  const monthEntries = entries.filter((e) => e.date.startsWith(monthKey));
  const done = monthEntries.filter((e) => e.status === "done").length;
  const missed = monthEntries.filter((e) => e.status === "missed").length;
  const tracked = done + missed;
  return tracked > 0 ? Math.round((done / tracked) * 100) : null;
}

export function QuestSummaryCard({ questHistory, year, month }: Props) {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const prevMonthKey = month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;

  const rows = useMemo(() => {
    return Object.entries(questHistory.quests).map(([id, quest]) => {
      const monthEntries = quest.entries.filter((e) => e.date.startsWith(monthKey));
      const done = monthEntries.filter((e) => e.status === "done").length;
      const missed = monthEntries.filter((e) => e.status === "missed").length;
      const excused = monthEntries.filter((e) => e.status === "excused").length;
      const tracked = done + missed;
      const rate = tracked > 0 ? Math.round((done / tracked) * 100) : null;
      const prevRate = monthRate(quest.entries, prevMonthKey);
      const rateDelta = rate !== null && prevRate !== null ? rate - prevRate : null;
      return { id, name: quest.name, done, missed, excused, rate, rateDelta, hasData: monthEntries.length > 0 };
    });
  }, [questHistory, monthKey, prevMonthKey]);

  const hasAnyData = rows.some((r) => r.hasData);

  if (!hasAnyData) {
    return (
      <div className="border-2 border-foreground p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Side Quests</h3>
        <p className="text-sm text-muted-foreground font-mono">No quest data for this month.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground p-4 space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Side Quests</h3>

      <div className="space-y-2">
        {/* Header */}
        <div className="flex text-[9px] uppercase tracking-wider text-muted-foreground border-b border-foreground/20 pb-1">
          <span className="flex-1">Quest</span>
          <span className="w-9 text-right">Done</span>
          <span className="w-9 text-right">Miss</span>
          <span className="w-9 text-right">Exc</span>
          <span className="w-11 text-right">Rate</span>
          <span className="w-16 text-right whitespace-nowrap">vs Prev</span>
        </div>

        {rows.map((r) => (
          <div key={r.id} className="flex items-center">
            <span className="flex-1 text-[11px] font-mono text-foreground truncate">{r.name}</span>
            {r.hasData ? (
              <>
                <span className="w-9 text-[11px] font-mono text-right" style={{ color: "#22c55e" }}>{r.done}</span>
                <span className="w-9 text-[11px] font-mono text-right" style={{ color: "#ef4444" }}>{r.missed}</span>
                <span className="w-9 text-[11px] font-mono text-right text-muted-foreground">{r.excused}</span>
                <span className="w-11 text-[11px] font-mono font-bold text-right">
                  {r.rate !== null ? `${r.rate}%` : "—"}
                </span>
                <span
                  className="w-16 text-[10px] font-mono text-right"
                  style={{ color: r.rateDelta === null || r.rateDelta === 0 ? undefined : r.rateDelta > 0 ? "#22c55e" : "#ef4444" }}
                >
                  {r.rateDelta !== null ? `${r.rateDelta > 0 ? "+" : ""}${r.rateDelta}` : "—"}
                </span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 font-mono">no data</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-[9px] text-muted-foreground/60 font-mono">Rate = done ÷ (done + missed). Excused days excluded. Delta vs last month shown in green/red.</p>
    </div>
  );
}
