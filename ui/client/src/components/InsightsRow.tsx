/**
 * InsightsRow — Horizontal row of insight cards between command strip and feed.
 * Athlete OS: compact charts, hard borders, monospace numbers.
 * Uses recharts (already in deps).
 */
import { useMemo } from "react";
import {
  Activity,
  groupByWeek,
  getSportConfig,
  getSportGroup,
  totalTime,
  formatDurationShort,
  getThisWeekActivities,
  getLastWeekActivities,
  totalCalories,
  avgHr,
  parseLocal,
} from "@/lib/activities";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";

interface Props {
  activities: Activity[];
}

export function InsightsRow({ activities }: Props) {
  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <WeeklyVolumeChart activities={activities} />
        <SportDistribution activities={activities} />
        <HrTrendChart activities={activities} />
        <WeekComparison activities={activities} />
      </div>
    </div>
  );
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

function WeeklyVolumeChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const weeks = groupByWeek(activities);
    const entries = Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8); // last 8 weeks

    return entries.map(([weekKey, acts]) => {
      const d = new Date(weekKey);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const hours = totalTime(acts) / 3600;
      return { week: label, hours: Math.round(hours * 10) / 10, sessions: acts.length };
    });
  }, [activities]);

  return (
    <ChartCard title="Weekly Volume">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "#999" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{
                  background: "#000",
                  color: "#fff",
                  fontSize: 11,
                  fontFamily: "Space Mono, monospace",
                  padding: "3px 8px",
                  lineHeight: 1,
                }}>
                  {payload[0].value}h
                </div>
              );
            }}
          />
          <Bar dataKey="hours" fill="#000" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function SportDistribution({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const groups = new Map<string, number>();
    for (const a of activities) {
      const group = getSportGroup(a.sport_type);
      groups.set(group, (groups.get(group) || 0) + 1);
    }
    return Array.from(groups.entries())
      .map(([sport, count]) => ({
        name: getSportConfig(sport).label,
        value: count,
        color: getSportConfig(sport).color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activities]);

  return (
    <ChartCard title="Sport Split">
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={45}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2 h-2 shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider flex-1">{d.name}</span>
              <span className="text-[10px] font-mono">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function HrTrendChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    return activities
      .filter((a) => a.average_heartrate)
      .slice(0, 30) // last 30 sessions with HR
      .reverse()
      .map((a) => {
        const d = parseLocal(a.start_date_local);
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          avg: Math.round(a.average_heartrate!),
          peak: Math.round(a.max_heartrate || 0),
          sport: a.sport_type,
        };
      });
  }, [activities]);

  return (
    <ChartCard title="HR Trend (Last 30)">
      <ResponsiveContainer width="100%" height={120}>
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
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#000"
            strokeWidth={1.5}
            dot={false}
            name="Avg HR"
          />
          <Line
            type="monotone"
            dataKey="peak"
            stroke="#FF4D00"
            strokeWidth={1}
            dot={false}
            name="Peak HR"
            strokeDasharray="3 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function WeekComparison({ activities }: { activities: Activity[] }) {
  const thisWeek = getThisWeekActivities(activities);
  const lastWeek = getLastWeekActivities(activities);

  const metrics = [
    {
      label: "Sessions",
      current: thisWeek.length,
      previous: lastWeek.length,
      format: (v: number) => String(v),
    },
    {
      label: "Time",
      current: totalTime(thisWeek),
      previous: totalTime(lastWeek),
      format: (v: number) => formatDurationShort(v),
    },
    {
      label: "Calories",
      current: totalCalories(thisWeek),
      previous: totalCalories(lastWeek),
      format: (v: number) => String(Math.round(v)),
    },
    {
      label: "Avg HR",
      current: avgHr(thisWeek) || 0,
      previous: avgHr(lastWeek) || 0,
      format: (v: number) => (v ? `${v}` : "—"),
    },
  ];

  return (
    <ChartCard title="This Week vs Last">
      <div className="space-y-3">
        {metrics.map((m) => {
          const diff = m.current - m.previous;
          const isUp = diff > 0;
          const isDown = diff < 0;
          return (
            <div key={m.label} className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="metric-sm">{m.format(m.current)}</span>
                {m.previous > 0 && diff !== 0 && (
                  <span
                    className={`text-[10px] font-mono ${
                      isUp ? "text-green-600" : isDown ? "text-red-500" : ""
                    }`}
                  >
                    {isUp ? "+" : ""}{m.label === "Time" ? formatDurationShort(Math.abs(diff)) : Math.round(diff)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
