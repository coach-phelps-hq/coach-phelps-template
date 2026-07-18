import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, HelpCircle } from "lucide-react";
import { Activity } from "@/lib/activities";
import { computeAcwr } from "./shared";

const STATUS_COPY: Record<string, { label: string; color: string; Icon: typeof TrendingUp; sub: string }> = {
  spike: { label: "Spike Risk", color: "#ef4444", Icon: AlertTriangle, sub: "load rising fast vs. your baseline" },
  building: { label: "Ramping Up", color: "#eab308", Icon: TrendingUp, sub: "load above your recent baseline" },
  steady: { label: "Steady", color: "#22c55e", Icon: Minus, sub: "load matches your recent baseline" },
  detraining: { label: "Detraining", color: "#999", Icon: TrendingDown, sub: "load below your recent baseline" },
  "insufficient-data": { label: "Not Enough Data", color: "#999", Icon: HelpCircle, sub: "need ~3+ weeks of sessions" },
};

export function LoadStatus({ sessions }: { sessions: Activity[] }) {
  const { status } = useMemo(() => computeAcwr(sessions), [sessions]);
  const { label, color, Icon, sub } = STATUS_COPY[status];

  return (
    <div className="border-2 border-foreground p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Load Status</div>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0" style={{ color }} />
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
