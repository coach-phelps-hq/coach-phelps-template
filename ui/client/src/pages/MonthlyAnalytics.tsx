import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import activitiesData from "@/data/activities.json";
import sleepLogRaw from "@/data/sleep_log.json";
import questHistoryRaw from "@/data/quest_history.json";
import challengeDataRaw from "@/data/challenge_v2.json";
import syncStatusData from "@/data/sync_status.json";
import { Activity, groupByMonth, totalTime, parseLocal, computeSleepStreak, daysElapsedInMonth, daysInMonth, isCurrentMonth } from "@/lib/activities";
import type { ChallengeV2 } from "@/lib/challenge";
import { CommandStrip } from "@/components/CommandStrip";
import { MonthCard } from "@/components/MonthCard";
import { WorkoutBreakdownCard } from "@/components/WorkoutBreakdownCard";
import { SleepSummaryCard } from "@/components/SleepSummaryCard";
import { QuestSummaryCard } from "@/components/QuestSummaryCard";

const activities = activitiesData as Activity[];

interface SleepEntry {
  date: string;
  hours: number;
  resting_hr: number | null;
  notes: string;
}
interface QuestEntry { date: string; status: "done" | "missed" | "excused" }
interface QuestHistory {
  generated_at: string;
  quests: Record<string, { name: string; entries: QuestEntry[] }>;
}

const sleepLog = sleepLogRaw as unknown as SleepEntry[];
const questHistory = questHistoryRaw as unknown as QuestHistory;
const challengeData = challengeDataRaw as unknown as ChallengeV2;
const sleepQuest = challengeData.quests.find((q) => q.id === "sleep");
const sleepStreak = computeSleepStreak(sleepQuest?.completed_dates ?? []);

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getAvailableYears(activities: Activity[]): number[] {
  const years = new Set(activities.map((a) => parseLocal(a.start_date_local).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export default function MonthlyAnalytics() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const years = useMemo(() => getAvailableYears(activities), []);
  const byMonth = useMemo(() => groupByMonth(activities), []);

  // Year strip data — 12 months for selected year
  const yearStripData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const key = `${selectedYear}-${String(month).padStart(2, "0")}`;
      const acts = byMonth.get(key) ?? [];
      const activeDays = new Set(
        acts.map((a) => parseLocal(a.start_date_local).getDate())
      ).size;
      const totalHours = totalTime(acts) / 3600;
      return { month, activeDays, totalHours: Math.round(totalHours * 10) / 10, hasData: acts.length > 0 };
    });
  }, [selectedYear, byMonth]);

  // Month detail activities
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const monthActivities = byMonth.get(monthKey) ?? [];

  // Previous month for deltas
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevMonthNum = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthKey = `${prevYear}-${String(prevMonthNum).padStart(2, "0")}`;
  const prevMonthActivities = byMonth.get(prevMonthKey) ?? [];
  const prevSleepLog = sleepLog.filter((e) => e.date.startsWith(prevMonthKey));

  // For the current, in-progress month, only compare against the same day-of-month
  // range of the previous month so a partial month isn't diffed against a full one.
  // If the previous month is shorter, cap at its last day.
  const prevMonthActivitiesForDelta = isCurrentMonth(selectedYear, selectedMonth)
    ? prevMonthActivities.filter((a) => {
        const day = parseLocal(a.start_date_local).getDate();
        return day <= Math.min(now.getDate(), daysInMonth(prevYear, prevMonthNum));
      })
    : prevMonthActivities;

  // Navigation
  const prevMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }, [selectedMonth, selectedYear]);

  const nextMonth = useCallback(() => {
    const today = new Date();
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;
    if (isCurrentMonth) return;
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevMonth();
      if (e.key === "ArrowRight") nextMonth();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevMonth, nextMonth]);

  return (
    <div className="min-h-screen bg-background">
      <CommandStrip challengeData={challengeData} sleepStreak={sleepStreak} syncStatus={syncStatusData} showBack />
      <div className="border-b-2 border-foreground" />

      <div className="container py-6 px-4 md:px-6 space-y-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold tracking-tight">Monthly Analytics</h2>
          <p className="text-xs text-muted-foreground mt-1">Training, sleep & side quests by month</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Year</span>
          <div className="flex gap-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 text-xs font-mono font-bold border-2 transition-colors ${
                  y === selectedYear
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/30 hover:border-foreground"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Year strip — 12 month cards */}
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {yearStripData.map(({ month, activeDays, totalHours, hasData }) => (
            <MonthCard
              key={month}
              month={month}
              year={selectedYear}
              activeDays={activeDays}
              totalHours={totalHours}
              hasData={hasData}
              isSelected={month === selectedMonth}
              onClick={() => setSelectedMonth(month)}
            />
          ))}
        </div>

        {/* Month detail header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold uppercase tracking-tight">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {monthActivities.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground ml-1">
              {monthActivities.length} sessions · {daysElapsedInMonth(selectedYear, selectedMonth)} days
            </span>
          )}
        </div>

        {/* Workout left, sleep + quests stacked right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <WorkoutBreakdownCard
            activities={monthActivities}
            prevActivities={prevMonthActivitiesForDelta}
            year={selectedYear}
            month={selectedMonth}
          />
          <div className="flex flex-col gap-4 h-full">
            <SleepSummaryCard
              sleepLog={sleepLog}
              prevSleepLog={prevSleepLog}
              year={selectedYear}
              month={selectedMonth}
            />
            <QuestSummaryCard
              questHistory={questHistory}
              year={selectedYear}
              month={selectedMonth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
