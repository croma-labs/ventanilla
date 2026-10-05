import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@country/site";
import { onSubmit, setBusy, setTextAppearing, submitQuestion, useChatPhase, type Origin, type Submission } from "../../lib/chat-store";
import { readUiMessageStream, type SearchData, type Turn } from "../../lib/ui-stream";
import AssistantMessage, { type AssistantState } from "./AssistantMessage";
import PendingStatus, { type PendingStage } from "./PendingStatus";
import UserBubble from "./UserBubble";

type UserItem = { role: "user"; id: string; text: string; origin: Origin | null };
type AssistantItem = { role: "assistant" } & AssistantState;
type Item = UserItem | AssistantItem;

const pendingDelayMs = 150;
const uid = () => Math.random().toString(36).slice(2, 12);

const failure = (status: number) => (status === 429 ? site.ui.rateLimited : site.ui.unavailable);

async function ask(turns: Turn[], signal: AbortSignal) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: turns }),
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok || !response.body) throw new Error(failure(response.status));
  return response;
}

function useDelayedFlag(value: boolean, delay: number) {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!value) return setFlag(false);
    const timer = setTimeout(() => setFlag(true), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return flag;
}

export default function ChatSurface() {
  const phase = useChatPhase();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusyState] = useState(false);
  const [search, setSearch] = useState<SearchData | null>(null);
  const [playing, setPlaying] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const turns = useRef<Turn[]>([]);

  const patchAssistant = (id: string, patch: (message: AssistantItem) => Partial<AssistantItem>) =>
    setItems((current) => current.map((item) => (item.role === "assistant" && item.id === id ? { ...item, ...patch(item) } : item)));

  const run = useCallback(async ({ text, origin }: Submission) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const assistantId = uid();
    setItems((current) => [
      ...current,
      { role: "user", id: uid(), text, origin },
      { role: "assistant", id: assistantId, text: "", streaming: true, groundings: [], followUps: [] },
    ]);
    setSearch(null);
    setBusyState(true);
    setBusy(true);
    const history: Turn[] = [...turns.current, { role: "user", text }];
    let answer = "";
    let signature: string | undefined;
    try {
      const response = await ask(history.slice(-12), abort.signal);
      for await (const chunk of readUiMessageStream(response)) {
        if (abort.signal.aborted) break;
        if (chunk.type === "data-search") {
          setSearch(chunk.data);
          patchAssistant(assistantId, () => ({ groundings: chunk.data.groundings }));
        }
        if (chunk.type === "text-delta") {
          answer += chunk.delta;
          patchAssistant(assistantId, (message) => ({ text: message.text + chunk.delta }));
        }
        if (chunk.type === "message-metadata" && chunk.messageMetadata.answerComplete) patchAssistant(assistantId, () => ({ streaming: false }));
        if (chunk.type === "finish") {
          signature = chunk.messageMetadata?.signature;
          const metadata = chunk.messageMetadata;
          patchAssistant(assistantId, () => ({ followUps: metadata?.followUpSuggestions ?? [], verified: metadata?.verified, conversational: metadata?.conversational }));
        }
      }
      turns.current = [...history, { role: "assistant", text: answer, signature }];
    } catch (error) {
      if (!abort.signal.aborted) patchAssistant(assistantId, () => ({ text: error instanceof Error && error.message ? error.message : site.ui.unavailable }));
    } finally {
      patchAssistant(assistantId, () => ({ streaming: false }));
      if (controller.current === abort) {
        setBusyState(false);
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => onSubmit(run), [run]);

  useEffect(() => {
    const stop = () => controller.current?.abort();
    addEventListener("ventanilla:stop", stop);
    return () => removeEventListener("ventanilla:stop", stop);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q");
    if (location.pathname === "/chat" && query) {
      history.replaceState(null, "", "/chat");
      submitQuestion(query, null);
    } else if (location.pathname === "/chat") document.documentElement.dataset.phase = "chat";
  }, []);

  const previousPhase = useRef(phase);
  useEffect(() => {
    const leftChat = previousPhase.current === "chat" && phase === "landing";
    previousPhase.current = phase;
    if (!leftChat) return;
    controller.current?.abort();
    turns.current = [];
    setItems([]);
  }, [phase]);

  const userCount = items.filter((item) => item.role === "user").length;

  useEffect(() => {
    if (userCount < 2) return;
    const latest = items.findLast((item) => item.role === "user");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      document.querySelector(`[data-message-id="${latest?.id}"]`)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }),
    );
  }, [userCount]);

  const last = items.at(-1);
  const awaitingText = busy && last?.role === "assistant" && !last.text.trim();
  const showPending = useDelayedFlag(awaitingText && !playing, pendingDelayMs);
  const stage: PendingStage = search?.status === "searching" ? "searching" : search?.groundings.length ? "reviewing" : "thinking";
  const onPlayout = useCallback((value: boolean) => {
    setPlaying(value);
    setTextAppearing(value);
  }, []);

  if (phase !== "chat") return null;

  return (
    <>
      <div data-slot="chat-top-fade" aria-hidden />
      <main id="home-chat-main" data-slot="chat-surface" tabIndex={-1} className="relative flex min-h-dvh flex-1 flex-col outline-none">
        <h1 className="sr-only">{site.ui.conversation}</h1>
        <p role="status" aria-live="polite" aria-atomic className="sr-only">
          {busy ? site.ui.preparing : items.length ? site.ui.ready : ""}
        </p>
        <div role="region" aria-label={site.ui.messages} className="pt-[calc(1.5rem+84px)] sm:pt-[calc(2rem+84px)]">
          <div
            role="group"
            aria-busy={busy}
            data-slot="message-scroller-content"
            className="relative mx-auto flex w-full max-w-[720px] flex-col gap-7 px-6 pb-[336px] sm:px-7"
          >
            {items.map((item, index) =>
              item.role === "assistant" && !item.text.trim() ? null : item.role === "user" ? (
                <div key={item.id} data-slot="message-scroller-item" data-message-id={item.id} className="min-w-0 shrink-0">
                  <UserBubble text={item.text} origin={item.origin} fly />
                </div>
              ) : (
                <div key={item.id} data-slot="message-scroller-item" role="article" className="min-w-0 shrink-0">
                  <AssistantMessage message={item} animate isLast={index === items.length - 1} busy={busy} onPlayout={onPlayout} />
                </div>
              ),
            )}
            {showPending && (
              <div data-slot="message-scroller-item" data-message-id="assistant-pending" className="min-w-0 shrink-0">
                <PendingStatus stage={stage} sources={search?.groundings.map((grounding) => grounding.url) ?? []} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
