import { useEffect, useMemo, useState } from "react";
import { RepoDataGate } from "@/components/RepoDataGate";
import { useRepoData, type RepoData } from "@/hooks/useRepoData";
import { useAuth } from "@/contexts/AuthContext";
import type { Activity } from "@/lib/activities";
import type { ChallengeV2 } from "@/lib/challenge";
import { parseCurrentWeek } from "@/lib/currentWeek";
import { adaptCurrentWeek } from "@/components/home-warm/currentWeekAdapter";
import { buildLiveWeekContract } from "@/components/home-warm/liveWeekContract";
import { buildWarmHomeModel, type SyncStatusPayload } from "@/components/home-warm/warmHomeModel";
import { buildEngineSnapshot } from "@/components/home-warm/WarmInstrumentHome";
import { InstrumentHeader } from "@/components/home-warm/WarmInstrumentWidgets";
import {
  ConversationPane,
  EmptyChatPane,
  MobileThreadList,
  ThreadSidebar,
} from "@/components/coach-chat/CoachChatWidgets";
import {
  buildSeedThreads,
  challengeDayNumber,
  loadStoredThreads,
  purgeExpiredThreads,
  saveStoredThreads,
  threadStatus,
  type ChatStarter,
  type ChatThread,
} from "@/components/coach-chat/coachChatModel";
import "@/components/home-warm/warm-instrument.css";
import "@/components/coach-chat/coach-chat.css";

type MobileView = "list" | "thread" | "new";

export default function CoachChat() {
  const { data, loading, error, schemaUnsupported } = useRepoData();
  return (
    <RepoDataGate loading={loading} error={error} schemaUnsupported={schemaUnsupported}>
      {data && <CoachChatContent data={data} />}
    </RepoDataGate>
  );
}

function CoachChatContent({ data }: { data: RepoData }) {
  const auth = useAuth();
  const userKey = auth.login ?? (auth.status === "local" ? "local" : "anon");

  const activities = data.activities as Activity[];
  const challengeData = data.challenge_v2 as unknown as ChallengeV2;
  const syncStatusData = data.sync_status as SyncStatusPayload;

  const currentWeekRt = parseCurrentWeek(data.current_week);
  const currentWeek =
    currentWeekRt.availability.available && currentWeekRt.data
      ? adaptCurrentWeek(currentWeekRt.data, currentWeekRt.availability, activities)
      : undefined;

  const dayNumber = useMemo(() => challengeDayNumber(challengeData), [challengeData]);

  const engineLoad = useMemo(() => {
    const contract = currentWeek ?? buildLiveWeekContract(activities, challengeData);
    const model = buildWarmHomeModel(activities, challengeData, syncStatusData, contract);
    return buildEngineSnapshot(activities, model.engine).load;
  }, [activities, challengeData, currentWeek, syncStatusData]);

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const stored = loadStoredThreads(userKey);
    if (stored && stored.length > 0) return stored;
    return buildSeedThreads(engineLoad).map((thread) => ({ ...thread, status: "active" as const }));
  });
  const [activeId, setActiveId] = useState<string | null>(
    () => threads.find((thread) => threadStatus(thread) === "active")?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("new");

  const activeThread = threads.find((thread) => thread.id === activeId) ?? null;

  useEffect(() => {
    saveStoredThreads(userKey, threads);
  }, [threads, userKey]);

  useEffect(() => {
    function sweep() {
      setThreads((prev) => {
        const next = purgeExpiredThreads(prev);
        return next.length === prev.length ? prev : next;
      });
    }
    sweep();
    const timer = window.setInterval(sweep, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeId && !threads.some((thread) => thread.id === activeId)) {
      setActiveId(threads.find((thread) => threadStatus(thread) === "active")?.id ?? null);
    }
  }, [threads, activeId]);

  function firstActiveId(list: ChatThread[], excludeId?: string): string | null {
    return list.find((thread) => threadStatus(thread) === "active" && thread.id !== excludeId)?.id ?? null;
  }

  function archiveThread(id: string) {
    const now = Date.now();
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
              ...thread,
              status: "archived" as const,
              archived: true,
              archivedAt: now,
              deletedAt: undefined,
            }
          : thread,
      ),
    );
    if (activeId === id) {
      setActiveId(firstActiveId(threads, id));
      setDraft("");
      setMobileView("list");
    }
  }

  function unarchiveThread(id: string) {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
              ...thread,
              status: "active" as const,
              archived: false,
              archivedAt: undefined,
              deletedAt: undefined,
            }
          : thread,
      ),
    );
  }

  function deleteThread(id: string) {
    const now = Date.now();
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
              ...thread,
              status: "deleted" as const,
              archived: false,
              deletedAt: now,
            }
          : thread,
      ),
    );
    if (activeId === id) {
      setActiveId(firstActiveId(threads, id));
      setDraft("");
      setMobileView("list");
    }
  }

  function restoreThread(id: string) {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id
          ? {
              ...thread,
              status: "active" as const,
              archived: false,
              archivedAt: undefined,
              deletedAt: undefined,
            }
          : thread,
      ),
    );
  }

  function deleteForever(id: string) {
    setThreads((prev) => prev.filter((thread) => thread.id !== id));
    if (activeId === id) {
      setActiveId(firstActiveId(threads, id));
      setDraft("");
      setMobileView("list");
    }
  }

  function startNewConversation() {
    setActiveId(null);
    setDraft("");
    setMobileView("new");
  }

  function selectThread(id: string) {
    setActiveId(id);
    setDraft("");
    setMobileView("thread");
  }

  function appendUserMessage(text: string, targetId: string | null) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!targetId) {
      const id = `local-${Date.now()}`;
      const created: ChatThread = {
        id,
        dayOffset: 0,
        title: trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed,
        preview: trimmed,
        ageLabel: "NOW",
        status: "active",
        messages: [
          { id: `${id}-d`, role: "divider", label: "TODAY" },
          { id: `${id}-u`, role: "user", text: trimmed },
        ],
      };
      setThreads((prev) => [created, ...prev]);
      setActiveId(id);
      setDraft("");
      setMobileView("thread");
      return;
    }

    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== targetId) return thread;
        return {
          ...thread,
          preview: trimmed,
          ageLabel: "NOW",
          status: "active",
          archived: false,
          archivedAt: undefined,
          deletedAt: undefined,
          messages: [
            ...thread.messages,
            { id: `${thread.id}-${Date.now()}`, role: "user", text: trimmed },
          ],
        };
      }),
    );
    setDraft("");
    setMobileView("thread");
  }

  function handleStarter(starter: ChatStarter) {
    appendUserMessage(starter.label, null);
  }

  const threadActions = {
    onArchive: archiveThread,
    onUnarchive: unarchiveThread,
    onDelete: deleteThread,
    onRestore: restoreThread,
    onDeleteForever: deleteForever,
  };

  return (
    <div className="wi-shell">
      <div className="wi-board">
        <InstrumentHeader
          phaseLabel="COACH CHAT"
          mobilePhaseLabel="COACH"
          syncHealthy={syncStatusData.status === "success" || syncStatusData.status === "none"}
          syncLabel={syncStatusData.status}
          workoutsHref="/workouts"
          currentRoute="/coach-chat"
        />

        <div className="cc-shell">
          <div className="cc-frame">
            <div className="cc-desktop-chat">
              <ThreadSidebar
                dayNumber={dayNumber}
                threads={threads}
                activeId={activeId}
                onSelect={selectThread}
                onNew={startNewConversation}
                {...threadActions}
              />
              {activeThread ? (
                <ConversationPane
                  dayNumber={dayNumber}
                  thread={activeThread}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => appendUserMessage(draft, activeId)}
                />
              ) : (
                <EmptyChatPane
                  dayNumber={dayNumber}
                  engineLoad={engineLoad}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => appendUserMessage(draft, null)}
                  onStarter={handleStarter}
                />
              )}
            </div>

            <div className="cc-mobile-chat">
              {mobileView === "list" ? (
                <MobileThreadList
                  dayNumber={dayNumber}
                  threads={threads}
                  activeId={activeId}
                  onSelect={selectThread}
                  onNew={startNewConversation}
                  {...threadActions}
                />
              ) : null}
              {mobileView === "thread" && activeThread ? (
                <ConversationPane
                  dayNumber={dayNumber}
                  thread={activeThread}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => appendUserMessage(draft, activeId)}
                  showBack
                  onBack={() => setMobileView("list")}
                />
              ) : null}
              {mobileView === "new" ? (
                <EmptyChatPane
                  dayNumber={dayNumber}
                  engineLoad={engineLoad}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => appendUserMessage(draft, null)}
                  onStarter={handleStarter}
                  showBack
                  onBack={() => setMobileView("list")}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
