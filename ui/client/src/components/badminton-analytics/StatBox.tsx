export function StatBox({
  label,
  value,
  sub,
  inlineSub,
}: {
  label: string;
  value: string;
  sub?: string;
  inlineSub?: string;
}) {
  return (
    <div className="border-2 border-foreground p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-mono font-black leading-none">{value}</div>
        {inlineSub && <div className="text-xs font-mono text-muted-foreground">{inlineSub}</div>}
      </div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
