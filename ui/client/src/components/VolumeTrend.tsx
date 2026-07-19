/**
 * VolumeTrend — Stacked weekly volume chart by training category + HR trend.
 * Athlete OS: hard borders, monospace, category colors.
 */
import { useMemo } from "react";
import {
  Activity,
  groupByWeek,
  getTrainingCategory,
  CATEGORY_CONFIG,
  totalTime,
  parseLocal,
} from "@/lib/activities";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Props {
  activities: Activity[];
}

const STACK_GROUPS = [
  { key: "foundation",       label: "Foundation",         color: CATEGORY_CONFIG.foundation.color },
  { key: "strength",         label: "Strength",           color: CATEGORY_CONFIG.strength.color },
  { key: "calisthenics",     label: "Calisthenics",       color: CATEGORY_CONFIG.calisthenics.color },
  { key: "run",              label: "Run",                color: CATEGORY_CONFIG.run.color },
  { key: "swim",             label: "Swim",               color: CATEGORY_CONFIG.swim.color },
  { key: "hike",             label: "Hike",               color: CATEGORY_CONFIG.hike.color },
  { key: "walk",             label: "Walk",               color: CATEGORY_CONFIG.walk.color },
  { key: "cricket",          label: "Cricket",            color: CATEGORY_CONFIG.cricket.color },
  { key: "football",         label: "Football",           color: CATEGORY_CONFIG.football.color },
  { key: "workout",          label: "Workout",            color: CATEGORY_CONFIG.workout.color },
  { key: "badminton_ranked",   label: "Badminton (Ranked)",   color: CATEGORY_CONFIG.badminton_ranked.color },
  { key: "badminton_league",   label: "Badminton (League)",   color: CATEGORY_CONFIG.badminton_league.color },
  { key: "badminton_friendly", label: "Badminton (Friendly)", color: CATEGORY_CONFIG.badminton_friendly.color },
  { key: "badminton_casual",   label: "Badminton (Casual)",   color: CATEGORY_CONFIG.badminton_casual.color },
  { key: "other",            label: "Other",              color: CATEGORY_CONFIG.other.color },
];

function categoryToStackGroup(cat: string): string {
  if (cat === "badminton_ranked" || cat === "badminton_league" || cat === "badminton_friendly" || cat === "badminton_casual") return cat;
  if (cat === "calisthenics") return "calisthenics";
  if (["foundation", "run", "swim", "hike", "walk", "cricket", "football", "workout"].includes(cat)) return cat;
  if (cat === "strength" || cat === "weight_training") return "strength";
  return "other";
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-foreground p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StackedVolumeChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const weeks = groupByWeek(activities);
    const entries = Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8);

    return entries.map(([weekKey, acts]) => {
      const d = new Date(weekKey);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      // Group hours by stack group
      const grouped: Record<string, number> = {};
      for (const g of STACK_GROUPS) grouped[g.key] = 0;

      for (const a of acts) {
        const cat = getTrainingCategory(a);
        const group = categoryToStackGroup(cat);
        grouped[group] = (grouped[group] || 0) + a.elapsed_time / 3600;
      }

      // Round to 1 decimal
      for (const k of Object.keys(grouped)) {
        grouped[k] = Math.round(grouped[k] * 10) / 10;
      }

      return { week: label, ...grouped };
    });
  }, [activities]);

  return (
    <ChartCard title="Weekly Volume">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "#999" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={25}
            tickFormatter={(v) => `${v}h`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
              return (
                <div style={{
                  background: "#000",
                  color: "#fff",
                  fontSize: 11,
                  fontFamily: "Space Mono, monospace",
                  padding: "6px 10px",
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{label} — {Math.round(total * 10) / 10}h</div>
                  {payload.filter(p => Number(p.value) > 0).map((p) => (
                    <div key={p.dataKey as string} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, backgroundColor: p.color, flexShrink: 0 }} />
                      <span>{STACK_GROUPS.find(g => g.key === p.dataKey)?.label}</span>
                      <span style={{ marginLeft: "auto" }}>{p.value}h</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {STACK_GROUPS.map((g) => (
            <Bar key={g.key} dataKey={g.key} stackId="volume" fill={g.color} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function HrTrendChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    return activities
      .filter((a) => a.average_heartrate)
      .slice(-30)
      .reverse()
      .map((a) => {
        const d = parseLocal(a.start_date_local);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          avg: Math.round(a.average_heartrate!),
          peak: Math.round(a.max_heartrate || 0),
        };
      });
  }, [activities]);

  return (
    <ChartCard title="HR Trend (Last 30)">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={["dataMin - 10", "dataMax + 10"]}
            tick={{ fontSize: 9, fill: "#999" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "#000",
              border: "none",
              color: "#fff",
              fontSize: 11,
              fontFamily: "Space Mono, monospace",
            }}
          />
          <Line type="monotone" dataKey="avg" stroke="#000" strokeWidth={1.5} dot={false} name="Avg HR" />
          <Line type="monotone" dataKey="peak" stroke="#FF4D00" strokeWidth={1} dot={false} name="Peak HR" strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VolumeTrend({ activities }: Props) {
  return (
    <div className="container pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StackedVolumeChart activities={activities} />
        <div className="hidden md:block">
          <HrTrendChart activities={activities} />
        </div>
      </div>
    </div>
  );
}
