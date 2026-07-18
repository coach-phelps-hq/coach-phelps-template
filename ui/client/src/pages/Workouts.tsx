/**
 * Athlete OS — Workout Picker
 * Lists available workouts grouped by type. Shows today's session if available,
 * otherwise falls back to base template. Tap a card to start the timer.
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Clock, MapPin, Dumbbell, ChevronRight } from "lucide-react";
import workoutsData from "@/data/workouts.json";
import {
  Workout,
  WorkoutsData,
  WorkoutType,
  WORKOUT_TYPE_CONFIG,
  getWorkoutForToday,
  getLatestSession,
  countExercises,
  countSets,
} from "@/lib/workouts";

const data = workoutsData as WorkoutsData;

function WorkoutCard({ workout, hasSession }: { workout: Workout; hasSession: boolean }) {
  const config = WORKOUT_TYPE_CONFIG[workout.workout_type];
  const exercises = countExercises(workout);
  const sets = countSets(workout);

  return (
    <Link href={`/workouts/${workout.id}`}>
      <div className="border-2 border-foreground bg-card hover:bg-secondary transition-colors cursor-pointer group">
        {/* Category bar */}
        <div className="h-1" style={{ backgroundColor: config.color }} />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5"
                  style={{ backgroundColor: config.color, color: "#fff" }}
                >
                  {config.label}
                </span>
                {hasSession && (
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 bg-primary text-primary-foreground">
                    TODAY
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold tracking-tight">{workout.title}</h3>
              <p className="text-sm text-muted-foreground">{workout.subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
          </div>

          {/* Coaching note */}
          {workout.coaching_note && (
            <p className="mt-3 text-xs text-muted-foreground border-l-2 pl-3 italic" style={{ borderColor: config.color }}>
              {workout.coaching_note}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{workout.estimated_duration_mins}m</span>
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5" />
              <span className="font-mono">{exercises} exercises</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono">{sets} sets</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{workout.location}</span>
            </span>
          </div>

          {/* Phases preview */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workout.phases.map((phase) => (
              <span
                key={phase.name}
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-foreground/20 text-muted-foreground"
              >
                {phase.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Workouts() {
  const today = new Date().toISOString().slice(0, 10);

  // Build the display list: for each template, check if there's a session for today
  const workoutCards = useMemo(() => {
    return data.templates.map((template) => {
      const todaySession = data.sessions.find(
        (s) => s.id === template.id && s.session_date === today,
      );
      return {
        workout: todaySession ?? template,
        hasSession: !!todaySession,
      };
    });
  }, [today]);

  // Group by workout_type
  const grouped = useMemo(() => {
    const groups: Record<string, typeof workoutCards> = {};
    for (const card of workoutCards) {
      const type = card.workout.workout_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(card);
    }
    return groups;
  }, [workoutCards]);

  const typeOrder: WorkoutType[] = ["foundation", "calisthenics", "strength", "recovery", "realign"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-foreground text-background">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 hover:bg-background/10 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h1 className="text-base font-bold tracking-tight uppercase">
              Workouts
            </h1>
          </div>
        </div>
      </header>

      <div className="border-b-2 border-foreground" />

      {/* Content */}
      <div className="container py-6">
        {/* Today's sessions callout */}
        {workoutCards.some((c) => c.hasSession) && (
          <div className="mb-6 border-2 border-primary bg-primary/5 p-4">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "oklch(0.60 0.22 30)" }}>
              Coach has customized workouts for today
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Session-specific modifications are applied. Look for the TODAY badge.
            </p>
          </div>
        )}

        {/* Grouped workout cards */}
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const cards = grouped[type];
            if (!cards || cards.length === 0) return null;
            const config = WORKOUT_TYPE_CONFIG[type];

            return (
              <div key={type}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {config.label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cards.map((card) => (
                    <WorkoutCard
                      key={card.workout.id}
                      workout={card.workout}
                      hasSession={card.hasSession}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
