import { Link } from "wouter";
import { ArrowLeft, Clock, Dumbbell, Repeat } from "lucide-react";
import {
  Workout,
  WORKOUT_TYPE_CONFIG,
  countExercises,
  countSets,
} from "@/lib/workouts";

export function WorkoutOverview({
  workout,
  onStart,
}: {
  workout: Workout;
  onStart: () => void;
}) {
  const config = WORKOUT_TYPE_CONFIG[workout.workout_type];
  const exercises = countExercises(workout);
  const sets = countSets(workout);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-foreground text-background">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Link href="/workouts">
              <button className="p-2 hover:bg-background/10 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <h1 className="text-base font-bold tracking-tight uppercase">
              {workout.title}
            </h1>
          </div>
        </div>
      </header>
      <div className="border-b-2 border-foreground" />

      <div className="container py-6 flex-1 flex flex-col">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[10px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5"
            style={{ backgroundColor: config.color, color: "#fff" }}
          >
            {config.label}
          </span>
          {workout.session_date && (
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 bg-primary text-primary-foreground">
              {workout.session_date}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-2">{workout.subtitle}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{workout.estimated_duration_mins}m</span>
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="font-mono">{exercises} exercises · {sets} sets</span>
          </span>
        </div>

        {/* Coaching note */}
        {workout.coaching_note && (
          <div
            className="border-l-2 pl-3 mb-6 text-sm italic text-muted-foreground"
            style={{ borderColor: config.color }}
          >
            {workout.coaching_note}
          </div>
        )}

        {/* Equipment */}
        {workout.equipment && workout.equipment.length > 0 && (
          <div className="border-2 border-foreground p-3 mb-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Equipment
            </div>
            <div className="text-sm font-mono">
              {workout.equipment.join(" · ")}
            </div>
          </div>
        )}

        {/* Phase list */}
        <div className="space-y-4 flex-1">
          {workout.phases.map((phase, pi) => (
            <div key={pi} className={`border-2 ${phase.optional ? "border-amber-300/40" : "border-foreground/10"}`}>
              <div className={`px-4 py-2 border-b ${phase.optional ? "bg-amber-50/50 border-amber-200/40 dark:bg-amber-900/10 dark:border-amber-700/20" : "bg-secondary border-foreground/10"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      {phase.name}
                    </h3>
                    {phase.optional && (
                      <span className="text-[9px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.5 bg-amber-400/20 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                        optional
                      </span>
                    )}
                    {phase.circuit && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <Repeat className="w-3 h-3" />
                        {phase.rounds ?? 1}×
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {phase.duration}
                  </span>
                </div>
                {phase.coaching_note && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                    {phase.coaching_note}
                  </p>
                )}
              </div>
              <div className="divide-y divide-foreground/5">
                {phase.exercises.map((ex) => (
                  <div key={ex.num} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                      {ex.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        {ex.optional && (
                          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">
                            optional
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {ex.form_cue}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {ex.type === "timed"
                        ? `${ex.sets}×${ex.duration_secs}s`
                        : `${ex.sets}×${ex.reps}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Start button */}
        <div className="mt-6 pb-4">
          <button
            onClick={onStart}
            className="w-full py-4 bg-foreground text-background font-bold uppercase tracking-widest text-sm hover:bg-foreground/90 transition-colors border-2 border-foreground"
          >
            Start Workout
          </button>
        </div>
      </div>
    </div>
  );
}
