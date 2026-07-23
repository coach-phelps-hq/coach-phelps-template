import type { ChallengeV2 } from "@/lib/challenge";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ChatRole = "user" | "coach" | "divider";

export type CoachChip =
  | { kind: "engine"; label: string; value: string; status: string }
  | { kind: "sport"; color: string; label: string; note: string };

export type ChatMessage =
  | { id: string; role: "divider"; label: string }
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "coach";
      paragraphs: string[];
      chips?: CoachChip[];
      /** Inline mono highlight segments keyed as {{token}} in paragraphs. */
      highlights?: Record<string, { text: string; color: string }>;
    };

export type ChatThreadStatus = "active" | "archived" | "deleted";

export type ChatThread = {
  id: string;
  dayOffset: number;
  title: string;
  preview: string;
  ageLabel: string;
  statusLabel?: string;
  status?: ChatThreadStatus;
  /** @deprecated Prefer `status`. Kept for older localStorage payloads. */
  archived?: boolean;
  /** Epoch ms when moved to archived. Used for 30-day retention. */
  archivedAt?: number;
  /** Epoch ms when soft-deleted. Used for 7-day retention. */
  deletedAt?: number;
  messages: ChatMessage[];
};

export type ChatStarter = {
  id: string;
  label: string;
  icon: "week" | "cold" | "match";
};

export const ARCHIVED_RETENTION_DAYS = 30;
export const DELETED_RETENTION_DAYS = 7;
export const ARCHIVED_RETENTION_MS = ARCHIVED_RETENTION_DAYS * DAY_MS;
export const DELETED_RETENTION_MS = DELETED_RETENTION_DAYS * DAY_MS;

/** Challenge day since start (1-indexed). Falls back to 1 if dates are missing. */
export function challengeDayNumber(challenge: ChallengeV2, now = new Date()): number {
  const startRaw = challenge.challenge?.start_date;
  if (!startRaw) return 1;
  const start = new Date(`${startRaw}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / DAY_MS) + 1);
}

export function threadDayLabel(dayNumber: number, dayOffset: number): string {
  return `D-${Math.max(1, dayNumber - dayOffset)}`;
}

export const CHAT_STARTERS: ChatStarter[] = [
  { id: "week", label: "Review my week", icon: "week" },
  { id: "cold", label: "Why was the bar cold?", icon: "cold" },
  { id: "match", label: "Plan Thursday's match", icon: "match" },
];

export function threadStatus(thread: ChatThread): ChatThreadStatus {
  if (thread.status) return thread.status;
  if (thread.archived) return "archived";
  return "active";
}

export function isThreadExpired(thread: ChatThread, now = Date.now()): boolean {
  const status = threadStatus(thread);
  if (status === "deleted") {
    const deletedAt = thread.deletedAt ?? 0;
    return deletedAt > 0 && now - deletedAt >= DELETED_RETENTION_MS;
  }
  if (status === "archived") {
    const archivedAt = thread.archivedAt ?? 0;
    return archivedAt > 0 && now - archivedAt >= ARCHIVED_RETENTION_MS;
  }
  return false;
}

export function purgeExpiredThreads(threads: ChatThread[], now = Date.now()): ChatThread[] {
  return threads.filter((thread) => !isThreadExpired(thread, now));
}

export function normalizeThread(thread: ChatThread): ChatThread {
  const status = threadStatus(thread);
  return {
    ...thread,
    status,
    archived: status === "archived",
  };
}

function storageKey(userKey: string): string {
  return `coach-phelps:coach-chat:threads:v1:${userKey}`;
}

export function loadStoredThreads(userKey: string): ChatThread[] | null {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return purgeExpiredThreads(
      parsed.filter((item): item is ChatThread => Boolean(item && typeof item === "object" && "id" in item)),
    ).map(normalizeThread);
  } catch {
    return null;
  }
}

export function saveStoredThreads(userKey: string, threads: ChatThread[]): void {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(purgeExpiredThreads(threads).map(normalizeThread)));
  } catch {
    // Quota / private mode — ignore; UI still works in-memory.
  }
}

/** Seed threads from the Coach Chat design doc — illustrative history, not live LLM replies. */
export function buildSeedThreads(engineLoad: number | null): ChatThread[] {
  const load = engineLoad !== null ? String(engineLoad) : "—";
  const inBand = engineLoad !== null;

  return [
    {
      id: "bar-cold",
      dayOffset: 0,
      title: "Bar felt cold",
      preview: "Missed calisthenics twice this week…",
      ageLabel: "NOW",
      statusLabel: "READING YOUR WEEK",
      messages: [
        { id: "d1", role: "divider", label: "TODAY · 7:42" },
        {
          id: "u1",
          role: "user",
          text: "Missed the calisthenics session again — twice this week now. Starting to feel like I'm slipping.",
        },
        {
          id: "c1",
          role: "coach",
          paragraphs: [
            "Two missed bar days doesn't undo a block. Look at the whole picture before you decide you're slipping.",
            "Your load is still dead center — badminton and the ride carried the week. The bar being cold is one honest gap, not a collapse. Warm it tomorrow: two easy sets, no ego.",
          ],
          chips: [
            {
              kind: "engine",
              label: "ENGINE",
              value: load,
              status: inBand ? "IN BAND" : "BUILDING",
            },
            {
              kind: "sport",
              color: "#4f587a",
              label: "CAL 0/2",
              note: "THE BAR IS COLD",
            },
          ],
        },
        {
          id: "u2",
          role: "user",
          text: "Okay. Should I still play Marcus on Thursday, or use it to catch up on the bar?",
        },
        {
          id: "c2",
          role: "coach",
          paragraphs: [
            "Play. You're {{record}} against Marcus and climbing — that match sharpens you more than a make-up session. Do ten minutes of bar work in the warm-up and you keep both promises.",
          ],
          highlights: {
            record: { text: "3–2", color: "#315a4a" },
          },
        },
      ],
    },
    {
      id: "review-week",
      dayOffset: 4,
      title: "Review my week",
      preview: "Solid week — you held the band and…",
      ageLabel: "4D",
      messages: [
        { id: "rw-d", role: "divider", label: "4 DAYS AGO" },
        {
          id: "rw-u",
          role: "user",
          text: "Can you walk me through the week? What held and what slipped?",
        },
        {
          id: "rw-c",
          role: "coach",
          paragraphs: [
            "Solid week — you held the band and the badminton volume did the heavy lifting. The only honest gap is the cold bar. Close that before Sunday and Block 1 stays clean.",
          ],
        },
      ],
    },
    {
      id: "marcus",
      dayOffset: 11,
      title: "Marcus rematch",
      preview: "Your net game is what turned it…",
      ageLabel: "11D",
      messages: [
        { id: "m-d", role: "divider", label: "11 DAYS AGO" },
        {
          id: "m-u",
          role: "user",
          text: "Just finished the rematch with Marcus. Felt different this time.",
        },
        {
          id: "m-c",
          role: "coach",
          paragraphs: [
            "Your net game is what turned it. Keep that forward pressure — the rest of the court opens when he has to respect the soft kill.",
          ],
        },
      ],
    },
    {
      id: "deload",
      dayOffset: 18,
      title: "Deload or push?",
      preview: "Given the travel, I'd pull back to…",
      ageLabel: "18D",
      messages: [
        { id: "dl-d", role: "divider", label: "18 DAYS AGO" },
        {
          id: "dl-u",
          role: "user",
          text: "Travel next week — deload or try to hold the plan?",
        },
        {
          id: "dl-c",
          role: "coach",
          paragraphs: [
            "Given the travel, I'd pull back to easy volume and one skill session. Protect sleep; the block will still be there when you're home.",
          ],
        },
      ],
    },
    {
      id: "sleep",
      dayOffset: 42,
      title: "Sleep & easy days",
      preview: "Easy volume is doing the work you…",
      ageLabel: "6W",
      messages: [
        { id: "sl-d", role: "divider", label: "6 WEEKS AGO" },
        {
          id: "sl-u",
          role: "user",
          text: "Sleep has been rough. Should I still push hard sessions?",
        },
        {
          id: "sl-c",
          role: "coach",
          paragraphs: [
            "Easy volume is doing the work you think only hard days do. Keep the skill work; park the loaded session until sleep recovers.",
          ],
        },
      ],
    },
    {
      id: "handstand",
      dayOffset: 102,
      title: "Handstand plan",
      preview: "Wall holds first — we build the line…",
      ageLabel: "15W",
      messages: [
        { id: "hs-d", role: "divider", label: "15 WEEKS AGO" },
        {
          id: "hs-u",
          role: "user",
          text: "Where do we start on the handstand?",
        },
        {
          id: "hs-c",
          role: "coach",
          paragraphs: [
            "Wall holds first — we build the line before we chase freestanding time. Short, honest sets. No ego kicks.",
          ],
        },
      ],
    },
  ];
}
