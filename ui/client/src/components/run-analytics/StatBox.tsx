export function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-2 border-foreground p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-mono font-black leading-none">{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
