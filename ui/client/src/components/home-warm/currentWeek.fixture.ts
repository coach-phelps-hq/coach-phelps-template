export type CurrentWeekDataStatus = "placeholder" | "live";
export type WeekStatus = "draft" | "active" | "complete";
export type PlanIntent = "train" | "recovery" | "open" | "rest" | "review";
export type SessionDiscipline =
  | "badminton"
  | "calisthenics"
  | "cycling"
  | "foundation"
  | "recovery"
  | "other"
  | "run"
  | "strength"
  | "weight_training"
  | "hike"
  | "walk"
  | "cricket"
  | "football"
  | "workout"
  | "swim";
export type SessionPriority = "anchor" | "support" | "optional";
export type SessionStatus = "planned" | "completed" | "skipped" | "moved";
export type CoachTone = "steady" | "positive" | "caution";
export type CoachConfidence = "low" | "medium" | "high";

export interface CurrentWeekSession {
  id: string;
  discipline: SessionDiscipline;
  kind: string;
  title: string;
  priority: SessionPriority;
  status: SessionStatus;
  planned_duration_min: number | null;
  planned_load: number | null;
  template_id: string | null;
  session_file: string | null;
  coach_note: string | null;
  completion_activity_ids: number[];
}

export interface CurrentWeekDay {
  date: string;
  day: string;
  intent: PlanIntent;
  coach_note: string | null;
  sessions: CurrentWeekSession[];
}

export interface CoachComment {
  id: string;
  topic: "weekly_load" | "training_intensity" | "weekly_plan";
  headline: string;
  body: string;
  tone: CoachTone;
  priority: number;
  evidence_refs: string[];
  valid_from: string;
  valid_until: string;
}

export interface CurrentWeekContract {
  schema_version: 1;
  data_status: CurrentWeekDataStatus;
  week: {
    id: string;
    start_date: string;
    end_date: string;
    status: WeekStatus;
    phase_name: string;
    block_name: string;
    focus: string;
    guardrails: string[];
  };
  coach_read: {
    headline: string;
    body: string;
    tone: CoachTone;
    confidence: CoachConfidence;
    evidence_refs: string[];
    valid_from: string;
    valid_until: string;
  };
  days: CurrentWeekDay[];
  coach_comments: CoachComment[];
  updated_at: string;
  updated_by: string;
}

/**
 * UI-only fixture for the parallel Warm Instrument build.
 * Tech Lead will replace the import seam with generated `current_week.json` data.
 * `data_status: "placeholder"` must remain visible in the UI and must never be
 * interpreted as a live Coach prescription.
 */
export const CURRENT_WEEK_FIXTURE: CurrentWeekContract = {
  schema_version: 1,
  data_status: "placeholder",
  week: {
    id: "2026-W30",
    start_date: "2026-07-20",
    end_date: "2026-07-26",
    status: "draft",
    phase_name: "Build",
    block_name: "Capacity without noise",
    focus: "Protect the two court anchors; let the support work stay supportive.",
    guardrails: [
      "Keep the hard-dose ceiling intact after the second court session.",
      "No catch-up volume if recovery slips.",
    ],
  },
  coach_read: {
    headline: "Two anchors. One restraint.",
    body: "The week has enough stimulus already. Win it by protecting Monday and Thursday, then keep Friday genuinely optional.",
    tone: "steady",
    confidence: "medium",
    evidence_refs: ["current_week_plan", "weekly_load"],
    valid_from: "2026-07-20",
    valid_until: "2026-07-27",
  },
  days: [
    {
      date: "2026-07-20",
      day: "Monday",
      intent: "train",
      coach_note: "First anchor. Arrive fresh enough to compete late.",
      sessions: [
        {
          id: "2026-07-20-badminton-preview-1",
          discipline: "badminton",
          kind: "competitive",
          title: "Ranked court",
          priority: "anchor",
          status: "planned",
          planned_duration_min: 90,
          planned_load: null,
          template_id: null,
          session_file: null,
          coach_note: "Hold quality when the score tightens.",
          completion_activity_ids: [],
        },
      ],
    },
    {
      date: "2026-07-21",
      day: "Tuesday",
      intent: "recovery",
      coach_note: "Foundation only. Leave a little more than you found.",
      sessions: [
        {
          id: "2026-07-21-foundation-preview-1",
          discipline: "foundation",
          kind: "mobility",
          title: "Foundation reset",
          priority: "support",
          status: "planned",
          planned_duration_min: 15,
          planned_load: null,
          template_id: null,
          session_file: null,
          coach_note: "Easy range, no forcing.",
          completion_activity_ids: [],
        },
      ],
    },
    {
      date: "2026-07-22",
      day: "Wednesday",
      intent: "train",
      coach_note: "Strength without stealing from Thursday.",
      sessions: [
        {
          id: "2026-07-22-calisthenics-preview-1",
          discipline: "calisthenics",
          kind: "strength",
          title: "Pull + handstand",
          priority: "support",
          status: "planned",
          planned_duration_min: 45,
          planned_load: null,
          template_id: "workout_a",
          session_file: null,
          coach_note: "Stop one clean rep before grind.",
          completion_activity_ids: [],
        },
      ],
    },
    {
      date: "2026-07-23",
      day: "Thursday",
      intent: "train",
      coach_note: "Second anchor. Explore, do not chase volume.",
      sessions: [
        {
          id: "2026-07-23-badminton-preview-1",
          discipline: "badminton",
          kind: "friendly",
          title: "Friendly court",
          priority: "anchor",
          status: "planned",
          planned_duration_min: 90,
          planned_load: null,
          template_id: null,
          session_file: null,
          coach_note: "Use the session to test first-three-shot patterns.",
          completion_activity_ids: [],
        },
      ],
    },
    {
      date: "2026-07-24",
      day: "Friday",
      intent: "open",
      coach_note: "Ride only if the legs ask for movement, not proof.",
      sessions: [
        {
          id: "2026-07-24-cycling-preview-1",
          discipline: "cycling",
          kind: "endurance",
          title: "Easy spin",
          priority: "optional",
          status: "planned",
          planned_duration_min: 50,
          planned_load: null,
          template_id: null,
          session_file: null,
          coach_note: "Conversational throughout.",
          completion_activity_ids: [],
        },
      ],
    },
    {
      date: "2026-07-25",
      day: "Saturday",
      intent: "rest",
      coach_note: "Protect the adaptation day.",
      sessions: [],
    },
    {
      date: "2026-07-26",
      day: "Sunday",
      intent: "review",
      coach_note: "Review what carried into the final games, then plan forward.",
      sessions: [],
    },
  ],
  coach_comments: [
    {
      id: "preview-engine-comment",
      topic: "weekly_load",
      headline: "Load has room; intensity does not.",
      body: "Minutes can rise gently, but another hard dose would crowd the two court anchors.",
      tone: "steady",
      priority: 1,
      evidence_refs: ["weekly_load", "hr_zone_distribution_28d"],
      valid_from: "2026-07-20",
      valid_until: "2026-07-27",
    },
    {
      id: "preview-intensity-comment",
      topic: "training_intensity",
      headline: "Keep the hard work narrow.",
      body: "Let the court sessions own the top end; support work should remain quiet.",
      tone: "caution",
      priority: 2,
      evidence_refs: ["hr_zone_distribution_28d"],
      valid_from: "2026-07-20",
      valid_until: "2026-07-27",
    },
    {
      id: "preview-plan-comment",
      topic: "weekly_plan",
      headline: "Protect Monday and Thursday.",
      body: "Everything else should make those sessions better, not merely make the week fuller.",
      tone: "positive",
      priority: 3,
      evidence_refs: ["current_week_plan"],
      valid_from: "2026-07-20",
      valid_until: "2026-07-27",
    },
  ],
  updated_at: "2026-07-19T12:00:00+01:00",
  updated_by: "ui-fixture",
};
