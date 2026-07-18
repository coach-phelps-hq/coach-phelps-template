import { useMemo } from "react";
import { Activity, HR_ZONE_LABELS } from "@/lib/activities";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "./ChartCard";

export function HrZoneChart({ sessions }: { sessions: Activity[] }) {
  const { barData, zoneTotals } = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const zone of HR_ZONE_LABELS) totals[zone.key] = 0;
    for (const s of sessions) {
      if (!s.hr_zones) continue;
      for (const zone of HR_ZONE_LABELS) {
        totals[zone.key] += s.hr_zones[zone.key]?.seconds ?? 0;
      }
    }
    const totalSecs = Object.values(totals).reduce((s, v) => s + v, 0);
    const barEntry: Record<string, number | string> = { name: "all" };
    for (const zone of HR_ZONE_LABELS) {
      barEntry[zone.key] = totalSecs > 0 ? Math.round((totals[zone.key] / totalSecs) * 1000) / 10 : 0;
    }
    return { barData: [barEntry], zoneTotals: totals };
  }, [sessions]);

  const hasData = Object.values(zoneTotals).some((v) => v > 0);

  if (!hasData) {
    return (
      <ChartCard title="HR Zone Distribution (all sessions)">
        <p className="text-xs text-muted-foreground">No HR zone data available.</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="HR Zone Distribution (all sessions)">
      <ResponsiveContainer width="100%" height={40}>
        <BarChart data={barData} layout="vertical" barCategoryGap="0%">
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{ background: "#000", border: "none", color: "#fff", fontSize: 11, fontFamily: "Space Mono, monospace" }}
            formatter={(v: number, name: string) => {
              const zone = HR_ZONE_LABELS.find((z) => z.key === name);
              const mins = Math.round((zoneTotals[name] ?? 0) / 60);
              return [`${v}% (${mins} min)`, zone?.label ?? name];
            }}
          />
          {HR_ZONE_LABELS.map((zone) => (
            <Bar key={zone.key} dataKey={zone.key} stackId="zones" fill={zone.color} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-rows-2 grid-flow-col gap-x-6 gap-y-1.5 mt-3 justify-start">
        {HR_ZONE_LABELS.map((zone) => {
          const mins = Math.round((zoneTotals[zone.key] ?? 0) / 60);
          return (
            <div key={zone.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: zone.color }} />
              <span className="text-[10px] font-mono text-muted-foreground">
                {zone.label} {zone.range} - {mins} min
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
