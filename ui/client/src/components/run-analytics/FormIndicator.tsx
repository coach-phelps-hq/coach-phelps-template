import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Activity } from "@/lib/activities";
import { computeForm } from "./shared";

const FORM_COPY: Record<string, { label: string; color: string; Icon: typeof TrendingUp }> = {
  up: { label: "Getting Faster", color: "#22c55e", Icon: TrendingUp },
  down: { label: "Slowing Down", color: "#ef4444", Icon: TrendingDown },
  flat: { label: "Steady", color: "#999", Icon: Minus },
};

export function FormIndicator({ runs }: { runs: Activity[] }) {
  const form = useMemo(() => computeForm(runs), [runs]);
  const { label, color, Icon } = FORM_COPY[form];

  return (
    <div className="border-2 border-foreground p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Form</div>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0" style={{ color }} />
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mt-1">last 5 runs vs prior 5</div>
    </div>
  );
}
