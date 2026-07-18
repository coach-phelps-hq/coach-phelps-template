interface Props {
  month: number; // 1-12
  year: number;
  activeDays: number;
  totalHours: number;
  isSelected: boolean;
  hasData: boolean;
  onClick: () => void;
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function MonthCard({ month, year, activeDays, totalHours, isSelected, hasData, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 p-2 text-left transition-colors w-full ${
        isSelected
          ? "border-foreground bg-foreground text-background"
          : "border-foreground hover:bg-foreground/5"
      }`}
    >
      <div className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${isSelected ? "text-background/60" : "text-muted-foreground"}`}>
        {MONTH_SHORT[month - 1]}
      </div>
      {hasData ? (
        <>
          <div className={`text-sm font-mono font-bold leading-none ${isSelected ? "text-background" : "text-foreground"}`}>
            {activeDays}d
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
            {totalHours.toFixed(1)}h
          </div>
        </>
      ) : (
        <div className={`text-[10px] font-mono mt-1 ${isSelected ? "text-background/40" : "text-muted-foreground/40"}`}>
          —
        </div>
      )}
    </button>
  );
}
