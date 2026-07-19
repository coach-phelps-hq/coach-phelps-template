/**
 * CommandStrip — Top bar: title, challenge progress, streak counters, sync button.
 * Athlete OS: hard black bar, white text, orange accent for progress.
 * v3: Reads all metadata from challenge_v2.json — zero hardcoded values.
 */
import { useState } from "react";
import { ArrowLeft, RefreshCw, Dumbbell, CalendarDays, SportShoe, Trophy, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { computeColdShowerStreak } from "@/lib/activities";
import type { ChallengeV2 } from "@/lib/challenge";

interface SyncStatus {
  timestamp: string | null;
  status: string;
  activities_synced: number;
  activities_renamed: number;
  descriptions_parsed: number;
  warnings: string[];
  error?: string;
}

interface Props {
  challengeData: ChallengeV2;
  sleepStreak: number;
  syncStatus: SyncStatus;
  showBack?: boolean;
}

function daysSince(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 0);
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildTooltipText(s: SyncStatus): string {
  if (s.status === "none" || !s.timestamp) return "No sync data yet";
  const ago = timeAgo(s.timestamp);
  const parts: string[] = [];
  if (s.activities_synced > 0) parts.push(`${s.activities_synced} synced`);
  if (s.descriptions_parsed > 0) parts.push(`${s.descriptions_parsed} parsed`);
  if (s.activities_renamed > 0) parts.push(`${s.activities_renamed} renamed`);
  const summary = parts.length > 0 ? parts.join(", ") : "no new activities";
  if (s.status === "error") return `Sync failed ${ago}`;
  if (s.status === "partial") return `${ago} — ${summary} — ${s.warnings.length} warning(s)`;
  return `${ago} — ${summary}`;
}

export function CommandStrip({ challengeData, sleepStreak, syncStatus, showBack }: Props) {
  const [syncing, setSyncing] = useState(false);

  const ch = challengeData.challenge;
  const currentDay = daysSince(ch.start_date);
  const pct = Math.round((currentDay / ch.duration_days) * 100);

  // Cold shower streak
  const coldQuest = challengeData.quests.find((q) => q.id === "cold_shower");
  const coldStreak = coldQuest
    ? computeColdShowerStreak(coldQuest.start_date, coldQuest.missed_dates ?? [])
    : 0;

  // 6am wake-up streak (same default_done logic as cold shower)
  const wakeupQuest = challengeData.quests.find((q) => q.id === "6am_wakeup");
  const wakeupStreak = wakeupQuest
    ? computeColdShowerStreak(wakeupQuest.start_date, wakeupQuest.missed_dates ?? [])
    : 0;

  // Challenge display name (e.g., "60-Day" from "60-Day Challenge")
  const challengeShortName = ch.name.replace(/\s*Challenge\s*/i, "").trim() || ch.name;

  // Dot color for sync status indicator
  const dotColor =
    syncStatus.status === "error" ? "bg-red-500" :
    syncStatus.status === "partial" ? "bg-amber-500" :
    undefined;

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    toast.info("Syncing... usually takes ~30s");

    try {
      // NETLIFY: const res = await fetch("/.netlify/functions/trigger-sync", { method: "POST" });
      // TEMP: Using Vercel endpoint while Netlify credits are out. Swap back when returning to Netlify.
      const res = await fetch("/api/trigger-sync", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        toast.success("Sync triggered! Refresh in ~2 min to see results.");
      } else {
        toast.error(`Sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      toast.error("Could not reach sync endpoint.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="bg-foreground text-background">
      <div className="container py-3">
        <div className="flex flex-col gap-1.5">
          {/* Main row: title + streaks (desktop) + actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-2 shrink-0">
              {showBack && (
                <Link href="/">
                  <button className="p-2 -ml-2 hover:bg-background/10 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </Link>
              )}
              <Link href="/">
                <h1 className="text-base font-bold tracking-tight uppercase cursor-pointer hover:opacity-80 transition-opacity">
                  Coach Phelps HQ
                </h1>
              </Link>
            </div>

            {/* Challenge + Streaks — center, desktop only */}
            <div className="hidden sm:flex items-center gap-3 flex-1 justify-center">
              {/* Challenge compact */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-background/50">{challengeShortName}</span>
                <span className="text-[10px] text-background/40 font-mono">
                  Day {Math.min(currentDay, ch.duration_days)}
                </span>
                <span className="text-[10px] text-background/40 font-mono">
                  {Math.min(pct, 100)}%
                </span>
              </div>

              <span className="text-background/20">│</span>

              {/* Sleep streak */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-background/50">Sleep</span>
                <span className="text-xs font-mono font-bold" style={{ color: "#a78bfa" }}>
                  {sleepStreak}d
                </span>
              </div>

              <span className="text-background/20">│</span>

              {/* Cold shower streak */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-background/50">Cold</span>
                <span className="text-xs font-mono font-bold" style={{ color: "#2dd4bf" }}>
                  {coldStreak}d
                </span>
              </div>

              <span className="text-background/20">│</span>

              {/* 6am wake-up streak */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-background/50">6am</span>
                <span className="text-xs font-mono font-bold" style={{ color: "#f59e0b" }}>
                  {wakeupStreak}d
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link href="/workouts">
                <button
                  className="p-2 hover:bg-background/10 transition-colors"
                  title="Workouts"
                >
                  <Dumbbell className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/run">
                <button
                  className="p-2 hover:bg-background/10 transition-colors"
                  title="Run Analytics"
                >
                  <SportShoe className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/badminton">
                <button
                  className="p-2 hover:bg-background/10 transition-colors"
                  title="Badminton Analytics"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/badminton-match-analytics">
                <button
                  className="p-2 hover:bg-background/10 transition-colors"
                  title="Match Analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/monthly">
                <button
                  className="p-2 hover:bg-background/10 transition-colors"
                  title="Monthly Analytics"
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="relative p-2 hover:bg-background/10 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {dotColor && (
                      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {buildTooltipText(syncStatus)}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile-only streak row */}
          <div className="flex sm:hidden items-center gap-2 text-[10px] text-background/60">
            <span className="uppercase tracking-wider text-background/50">Sleep</span>
            <span className="font-mono font-bold" style={{ color: "#a78bfa" }}>{sleepStreak}d</span>
            <span className="text-background/30">·</span>
            <span className="uppercase tracking-wider text-background/50">Cold</span>
            <span className="font-mono font-bold" style={{ color: "#2dd4bf" }}>{coldStreak}d</span>
            <span className="text-background/30">·</span>
            <span className="uppercase tracking-wider text-background/50">6am</span>
            <span className="font-mono font-bold" style={{ color: "#f59e0b" }}>{wakeupStreak}d</span>
            <span className="text-background/30">·</span>
            <span className="font-mono text-background/40">
              Day {Math.min(currentDay, ch.duration_days)} · {Math.min(pct, 100)}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
