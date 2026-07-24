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

export async function fetchThreads(): Promise<ChatThread[]> {
  const res = await fetch("/api/coach-chat");
  if (!res.ok) throw new Error(`Failed to load coach chat (${res.status})`);
  const body = (await res.json()) as { threads: ChatThread[] };
  return purgeExpiredThreads(body.threads).map(normalizeThread);
}

export interface SendMessageResult {
  reply: string;
  threadId: string;
  threads: ChatThread[];
}

export async function sendMessage(threadId: string | null, message: string): Promise<SendMessageResult> {
  const res = await fetch("/api/coach-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId: threadId ?? undefined, message }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Coach chat request failed (${res.status})`);
  }
  const body = (await res.json()) as SendMessageResult;
  return { ...body, threads: purgeExpiredThreads(body.threads).map(normalizeThread) };
}

export async function setThreadStatus(threadId: string, status: ChatThreadStatus): Promise<ChatThread[]> {
  const res = await fetch("/api/coach-chat", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, status }),
  });
  if (!res.ok) throw new Error(`Failed to update thread (${res.status})`);
  const body = (await res.json()) as { threads: ChatThread[] };
  return purgeExpiredThreads(body.threads).map(normalizeThread);
}
