/**
 * GameFilter - Ranked / All Games toggle for the analytics page.
 * Syncs with URL search params (?mode=ranked|all).
 */

export type GameMode = "ranked" | "all";

interface Props {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
  rankedCount: number;
  allCount: number;
}

export function GameFilter({ mode, onChange, rankedCount, allCount }: Props) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <button
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          mode === "all"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All Games
        <span className="ml-1.5 opacity-60">{allCount}</span>
      </button>
      <button
        onClick={() => onChange("ranked")}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          mode === "ranked"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Ranked
        <span className="ml-1.5 opacity-60">{rankedCount}</span>
      </button>
    </div>
  );
}
