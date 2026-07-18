/**
 * ActivityHeatmap — Calendar grid with training category colors.
 * Athlete OS: hard edges, monospace, category-colored cells.
 * v2.1: Rolling 6-month calendar with training category colors.
 */
import { useMemo } from "react";
import {
  Activity,
  getTrainingCategory,
  getCategoryConfig,
  CATEGORY_CONFIG,
  formatDurationShort,
} from "@/lib/activities";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/useMobile";

interface Props {
  activities: Activity[];
}

interface DayData {
  date: string;
  activities: Activity[];
  totalSeconds: number;
  primaryCategory: string;
  primaryColor: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_PRIORITY = [
  "badminton_club", "badminton_drills", "badminton_casual",
  "calisthenics",
  "run", "swim", "hike", "strength", "weight_training", "foundation", "recovery", "realign",
  "ride", "walk", "cricket", "football", "workout", "other",
];

function buildDayMap(activities: Activity[]): Map<string, DayData> {
  const map = new Map<string, DayData>();
  for (const a of activities) {
    const dateKey = a.start_date_local.slice(0, 10);
    if (!map.has(dateKey)) {
      map.set(dateKey, { date: dateKey, activities: [], totalSeconds: 0, primaryCategory: "other", primaryColor: "#777" });
    }
    const day = map.get(dateKey)!;
    day.activities.push(a);
    day.totalSeconds += a.elapsed_time;
  }
  for (const day of Array.from(map.values())) {
    let bestPriority = CATEGORY_PRIORITY.length;
    for (const a of day.activities) {
      const cat = getTrainingCategory(a);
      const pri = CATEGORY_PRIORITY.indexOf(cat);
      if (pri !== -1 && pri < bestPriority) {
        bestPriority = pri;
        day.primaryCategory = cat;
        day.primaryColor = CATEGORY_CONFIG[cat].color;
      }
    }
  }
  return map;
}

function DayTooltipContent({ day }: { day: DayData }) {
  const d = new Date(day.date);
  const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="text-xs space-y-1">
      <div className="font-bold">{dateStr}</div>
      {day.activities.map((a) => {
        const config = getCategoryConfig(a);
        return (
          <div key={a.id} className="flex items-center gap-2">
            <div className="w-2 h-2 shrink-0" style={{ backgroundColor: config.color }} />
            <span>{config.label}</span>
            <span className="text-muted-foreground font-mono">{formatDurationShort(a.elapsed_time)}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({ year, month, dayMap }: { year: number; month: number; dayMap: Map<string, DayData> }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const now = new Date();
  const cellSize = 14;
  const gap = 2;

  return (
    <div className="shrink-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        {MONTH_NAMES[month]}
      </div>
      <div className="grid grid-cols-7" style={{ gap, width: 7 * (cellSize + gap) - gap }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-[8px] text-muted-foreground text-center" style={{ width: cellSize }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 mt-1" style={{ gap }}>
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`pad-${i}`} style={{ width: cellSize, height: cellSize }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const day = dayMap.get(dateStr);
          const isFuture = new Date(dateStr) > now;

          if (isFuture) {
            return <div key={i} style={{ width: cellSize, height: cellSize }} />;
          }
          if (!day) {
            return <div key={i} style={{ width: cellSize, height: cellSize, backgroundColor: "#f0f0f0" }} />;
          }

          const hours = day.totalSeconds / 3600;
          const opacity = Math.min(0.4 + (hours / 2) * 0.6, 1.0);

          return (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: day.primaryColor,
                    opacity,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-foreground text-background border-0">
                <DayTooltipContent day={day} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityHeatmap({ activities }: Props) {
  const dayMap = useMemo(() => buildDayMap(activities), [activities]);
  const isMobile = useIsMobile();

  // Rolling last 6 months; show 3 on mobile to avoid forced scroll
  const now = new Date();
  const allMonths: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    allMonths.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const months = isMobile ? allMonths.slice(-2) : allMonths;

  return (
    <div className="container py-6">
      <div className="border-2 border-foreground p-4">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Training Activity
          </h3>
          {isMobile && (
            <span className="text-[9px] text-muted-foreground font-mono">Last 2 months</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-6 flex-wrap">
            {months.map(({ year, month }) => (
              <MonthGrid key={`${year}-${month}`} year={year} month={month} dayMap={dayMap} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
