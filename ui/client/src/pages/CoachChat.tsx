import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RepoDataGate } from "@/components/RepoDataGate";
import { useRepoData, type RepoData } from "@/hooks/useRepoData";
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
  challengeDayNumber,
  fetchThreads,
  sendMessage,
  setThreadStatus as patchThreadStatus,
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

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("new");
  const [sending, setSending] = useState(false);

  const activeThread = threads.find((thread) => thread.id === activeId) ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchThreads()
      .then((loaded) => {
        if (cancelled) return;
        setThreads(loaded);
        setActiveId(loaded.find((thread) => threadStatus(thread) === "active")?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load Coach Chat");
      })
      .finally(() => {
        if (!cancelled) setThreadsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeId && !threads.some((thread) => thread.id === activeId)) {
      setActiveId(threads.find((thread) => threadStatus(thread) === "active")?.id ?? null);
    }
  }, [threads, activeId]);

  function firstActiveId(list: ChatThread[], excludeId?: string): string | null {
    return list.find((thread) => threadStatus(thread) === "active" && thread.id !== excludeId)?.id ?? null;
  }

  async function updateStatus(id: string, status: ChatThread["status"]) {
    const wasActive = activeId === id;
    if (wasActive && status !== "active") {
      setActiveId(firstActiveId(threads, id));
      setDraft("");
      setMobileView("list");
    }
    try {
      const next = await patchThreadStatus(id, status ?? "active");
      setThreads(next);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update conversation");
    }
  }

  function archiveThread(id: string) {
    void updateStatus(id, "archived");
  }

  function unarchiveThread(id: string) {
    void updateStatus(id, "active");
  }

  function deleteThread(id: string) {
    void updateStatus(id, "deleted");
  }

  function restoreThread(id: string) {
    void updateStatus(id, "active");
  }

  function deleteForever(id: string) {
    // Hard delete happens server-side once retention expires; from the UI, soft-delete
    // is the only action available — mirror it here so the button doesn't dead-end.
    void updateStatus(id, "deleted");
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

  async function appendUserMessage(text: string, targetId: string | null) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setDraft("");
    setMobileView("thread");
    setSending(true);
    try {
      const result = await sendMessage(targetId, trimmed);
      setThreads(result.threads);
      setActiveId(result.threadId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Coach didn't reply — try again");
      setDraft(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleStarter(starter: ChatStarter) {
    void appendUserMessage(starter.label, null);
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
              {threadsLoading ? (
                <aside className="cc-sidebar cc-loading" aria-label="Conversations">Loading conversations…</aside>
              ) : (
                <ThreadSidebar
                  dayNumber={dayNumber}
                  threads={threads}
                  activeId={activeId}
                  onSelect={selectThread}
                  onNew={startNewConversation}
                  {...threadActions}
                />
              )}
              {activeThread ? (
                <ConversationPane
                  dayNumber={dayNumber}
                  thread={activeThread}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => void appendUserMessage(draft, activeId)}
                />
              ) : (
                <EmptyChatPane
                  dayNumber={dayNumber}
                  engineLoad={engineLoad}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={() => void appendUserMessage(draft, null)}
                  onStarter={handleStarter}
                />
              )}
            </div>

            <div className="cc-mobile-chat">
              {mobileView === "list" && threadsLoading ? (
                <section className="cc-mobile-list cc-loading" aria-label="Conversations">
                  Loading conversations…
                </section>
              ) : null}
              {mobileView === "list" && !threadsLoading ? (
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
                  onSend={() => void appendUserMessage(draft, activeId)}
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
                  onSend={() => void appendUserMessage(draft, null)}
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
