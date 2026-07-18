export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-foreground p-4 h-full flex flex-col">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">{title}</h3>
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </div>
  );
}
