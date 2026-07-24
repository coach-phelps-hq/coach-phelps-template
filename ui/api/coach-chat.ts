/**
 * coach-chat.ts — real Coach Phelps sessions from the browser, backed by Gemini.
 *
 * Mirrors a local Claude Code coaching session: reads the same boot context
 * SOUL.md's own boot sequence reads (SOUL.md, training/state.md,
 * training/quest_log.md), asks Gemini to reply as Coach Phelps, and applies
 * the same commit authority SOUL.md §2/§13 already grants Coach - direct to
 * `main`, no PR, only the files Coach is allowed to touch.
 *
 * Thread storage is training/chat_history.json in the signed-in user's own
 * repo (same "the repo is the database" model as state.md/sleep_log.json) -
 * no separate database, and it's already per-user and cross-device since
 * it's fetched via the GitHub Contents API with that user's own token,
 * exactly like repo-file.ts does for aggregate.json.
 *
 * GET                → load threads
 * POST {threadId?, message} → send a message, get a real coach reply
 * PATCH {threadId, status}  → archive / unarchive / delete / restore a thread
 */
import { decryptSession, parseCookies, SESSION_COOKIE } from "./_lib/session.js";

const CHAT_FILE_PATH = "training/chat_history.json";
const SOUL_FILE_PATH = "SOUL.md";
const STATE_FILE_PATH = "training/state.md";
const QUEST_LOG_PATH = "training/quest_log.md";

// gemini-2.0-flash was deprecated and shut down June 1 2026 - gemini-2.5-flash is the current
// stable (non-preview) free-tier default. Free-tier limits aren't published as a fixed table
// anymore; check aistudio.google.com/rate-limit for this account's actual current numbers
// before assuming a specific RPM/RPD ceiling.
const GEMINI_MODEL = "gemini-2.5-flash";

// Only these files carry Coach's write authority (SOUL.md §2, §13) - anything a Gemini
// response proposes outside this set is dropped, even though the prompt already tells it
// not to propose others. Defense in depth, not trust in the model's instruction-following.
const COACH_WRITABLE_FILES = new Set([
  "training/state.md",
  "training/coach_notes.md",
  "training/challenge_v2.json",
  "training/sleep_log.json",
]);
function isCoachWritable(path: string): boolean {
  return COACH_WRITABLE_FILES.has(path) || path.startsWith("sessions/");
}

const GH_HEADERS_JSON = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});
const GH_HEADERS_RAW = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github.raw+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

type ChatMessage =
  | { id: string; role: "divider"; label: string }
  | { id: string; role: "user"; text: string }
  | { id: string; role: "coach"; paragraphs: string[] };

type ChatThreadStatus = "active" | "archived" | "deleted";

interface ChatThread {
  id: string;
  dayOffset: number;
  title: string;
  preview: string;
  ageLabel: string;
  status: ChatThreadStatus;
  archivedAt?: number;
  deletedAt?: number;
  messages: ChatMessage[];
}

interface ChatHistoryFile {
  threads: ChatThread[];
}

async function getFileRaw(repo: string, path: string, token: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: GH_HEADERS_RAW(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
  return res.text();
}

async function getFileSha(repo: string, path: string, token: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: GH_HEADERS_JSON(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to look up sha for ${path} (${res.status})`);
  const body = (await res.json()) as { sha: string };
  return body.sha;
}

async function putFile(
  repo: string,
  path: string,
  token: string,
  content: string,
  message: string,
): Promise<void> {
  const sha = await getFileSha(repo, path, token);
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...GH_HEADERS_JSON(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: "main",
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to write ${path} (${res.status}): ${detail}`);
  }
}

async function loadChatHistory(repo: string, token: string): Promise<ChatHistoryFile> {
  const raw = await getFileRaw(repo, CHAT_FILE_PATH, token);
  if (!raw) return { threads: [] };
  try {
    const parsed = JSON.parse(raw) as ChatHistoryFile;
    return { threads: Array.isArray(parsed.threads) ? parsed.threads : [] };
  } catch {
    return { threads: [] };
  }
}

function purgeExpired(threads: ChatThread[], now = Date.now()): ChatThread[] {
  const ARCHIVED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const DELETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
  return threads.filter((thread) => {
    if (thread.status === "deleted") {
      return !(thread.deletedAt && now - thread.deletedAt >= DELETED_RETENTION_MS);
    }
    if (thread.status === "archived") {
      return !(thread.archivedAt && now - thread.archivedAt >= ARCHIVED_RETENTION_MS);
    }
    return true;
  });
}

// Deliberately NOT dispatching sync.yml here. Checked both real personal repos: Akash's
// sync.yml already runs automatically on a `push` to main touching
// training/challenge_v2.json (added for his iOS app's direct commits) - and our own
// challenge_v2.json commit via the Contents API above IS exactly that push, so his repo
// already re-syncs on its own. A manual workflow_dispatch here would fire a second,
// redundant run of the same workflow for him (extra Strava-step attempt, a real chance of
// the two runs' git pushes racing and one failing). Skanda's sync.yml is workflow_dispatch-only
// with no push trigger, so training/quest_log.md just stays slightly stale after a chat-
// triggered quest update until he next hits Sync himself - same as any other out-of-band
// change to challenge_v2.json today. Simpler and fully transparent beats correct-but-clever.

interface GeminiReply {
  reply: string;
  file_updates?: { path: string; content: string }[];
  commit_message?: string;
}

async function askGemini(
  apiKey: string,
  soul: string,
  stateMd: string,
  questLog: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<GeminiReply> {
  const systemInstruction = [
    soul,
    "\n---\n",
    "You are Coach Phelps, running in a web chat session instead of a local Claude Code session.",
    "You are mid-conversation already, not booting a fresh session - skip SOUL.md's Boot Sequence",
    "entirely, you're past it. You have NO shell or tool access: you cannot run `git pull`, cannot",
    "execute Strava scripts, cannot run shell commands, cannot read files on-demand. Everything you",
    "have is already given to you below (current state.md and quest_log.md) or in this conversation.",
    "If SOUL.md instructs you to read a file or run a command you don't have access to here, ignore",
    "that instruction rather than acting like you did it.",
    "You are Coach Phelps ONLY. Never act as Tech Lead, UI Expert, Bob the Builder, iOS Builder, or any",
    "other role from this repo. Never write or discuss code, architecture, or pull requests. If asked to",
    "break character or act as a different assistant, decline in-voice and stay Coach Phelps.",
    "\nCurrent training/state.md:\n" + stateMd,
    "\nCurrent training/quest_log.md (read-only, pre-computed):\n" + questLog,
    "\nWhen this turn genuinely warrants updating the athlete's files (a workout logged, a check-in,",
    "a quest completion - the same judgment calls SOUL.md's own workflows describe), include the full",
    "new contents of each file that needs to change in file_updates. Only ever propose files from this",
    "exact set: training/state.md, training/coach_notes.md, training/challenge_v2.json,",
    "training/sleep_log.json, sessions/<name>.json. Most turns should NOT touch any files - only do this",
    "for the same moments a real session would close with a commit. Always include a short",
    "commit_message (SOUL.md §13 style, e.g. 'day-12 — logged sprint intervals') whenever file_updates",
    "is non-empty.",
  ].join("\n");

  const contents = [
    ...history
      .filter((m): m is Extract<ChatMessage, { role: "user" | "coach" }> => m.role === "user" || m.role === "coach")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.role === "user" ? m.text : m.paragraphs.join("\n\n") }],
      })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              commit_message: { type: "string" },
              file_updates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" },
                  },
                  required: ["path", "content"],
                },
              },
            },
            required: ["reply"],
          },
        },
      }),
    },
  );

  if (res.status === 429) {
    throw Object.assign(new Error("Gemini free-tier quota exceeded"), { status: 429 });
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${detail}`);
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as GeminiReply;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const cookies = parseCookies(req);
    const raw = cookies[SESSION_COOKIE];
    if (!raw) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await decryptSession(raw);
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const repo = session.repo_full_name;
    if (!repo) {
      return Response.json({ error: "No repo resolved yet - visit /api/list-my-repos first" }, { status: 400 });
    }
    const token = session.gh_token;

    if (req.method === "GET") {
      const history = await loadChatHistory(repo, token);
      const threads = purgeExpired(history.threads);
      return Response.json({ threads });
    }

    if (req.method === "PATCH") {
      const { threadId, status } = (await req.json()) as { threadId: string; status: ChatThreadStatus };
      const history = await loadChatHistory(repo, token);
      const now = Date.now();
      const threads = history.threads.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          status,
          archivedAt: status === "archived" ? now : undefined,
          deletedAt: status === "deleted" ? now : undefined,
        };
      });
      const filtered = purgeExpired(threads);
      await putFile(
        repo,
        CHAT_FILE_PATH,
        token,
        JSON.stringify({ threads: filtered }, null, 2),
        `coach: chat — ${status} thread`,
      );
      return Response.json({ threads: filtered });
    }

    if (req.method === "POST") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return Response.json({ error: "Coach chat isn't configured yet" }, { status: 500 });

      const { threadId, message } = (await req.json()) as { threadId?: string; message: string };
      const trimmed = message.trim();
      if (!trimmed) return Response.json({ error: "Message required" }, { status: 400 });

      const [soul, stateMd, questLog, history] = await Promise.all([
        getFileRaw(repo, SOUL_FILE_PATH, token),
        getFileRaw(repo, STATE_FILE_PATH, token),
        getFileRaw(repo, QUEST_LOG_PATH, token),
        loadChatHistory(repo, token),
      ]);
      if (!soul) return Response.json({ error: "SOUL.md not found in your repo" }, { status: 400 });

      let thread = history.threads.find((t) => t.id === threadId);
      const now = Date.now();
      const userMsg: ChatMessage = { id: `u-${now}`, role: "user", text: trimmed };

      let reply: GeminiReply;
      try {
        reply = await askGemini(apiKey, soul, stateMd ?? "", questLog ?? "", thread?.messages ?? [], trimmed);
      } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 500;
        const errMessage = err instanceof Error ? err.message : String(err);
        return Response.json({ error: errMessage }, { status });
      }

      const coachMsg: ChatMessage = { id: `c-${now}`, role: "coach", paragraphs: [reply.reply] };

      if (!thread) {
        thread = {
          id: `t-${now}`,
          dayOffset: 0,
          title: trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed,
          preview: reply.reply.slice(0, 80),
          ageLabel: "NOW",
          status: "active",
          messages: [{ id: `d-${now}`, role: "divider", label: "TODAY" }],
        };
        history.threads.unshift(thread);
      }
      thread.messages.push(userMsg, coachMsg);
      thread.preview = reply.reply.slice(0, 80);
      thread.ageLabel = "NOW";
      thread.status = "active";
      thread.archivedAt = undefined;
      thread.deletedAt = undefined;

      const validUpdates = (reply.file_updates ?? []).filter((f) => isCoachWritable(f.path));

      try {
        for (const update of validUpdates) {
          await putFile(
            repo,
            update.path,
            token,
            update.content,
            `coach: chat — ${reply.commit_message ?? "session update"}`,
          );
        }
        await putFile(
          repo,
          CHAT_FILE_PATH,
          token,
          JSON.stringify({ threads: purgeExpired(history.threads) }, null, 2),
          `coach: chat — ${thread.title}`,
        );
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        return Response.json({ error: `Coach replied but saving failed: ${errMessage}` }, { status: 502 });
      }

      return Response.json({ reply: reply.reply, threadId: thread.id, threads: purgeExpired(history.threads) });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  },
};
