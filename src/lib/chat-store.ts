import { site } from "@country/site";
import { useSyncExternalStore } from "react";

export type Phase = "landing" | "chat";

export type Origin = { left: number; top: number; width: number; height: number; scrollY: number; fixed: boolean };

export type Submission = { text: string; origin: Origin | null };

let phase: Phase = typeof location !== "undefined" && location.pathname === "/chat" ? "chat" : "landing";
let busy = false;
let appearing = false;
const phaseListeners = new Set<() => void>();
const submitListeners = new Set<(submission: Submission) => void>();
let pending: Submission | null = null;

const setPhase = (next: Phase) => {
  phase = next;
  document.documentElement.dataset.phase = next;
  phaseListeners.forEach((listener) => listener());
};

export const snapshotOrigin = (element: Element | null): Origin | null => {
  if (!element) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height, scrollY, fixed: Boolean(element.closest('[data-slot="ask-dock"]')) };
};

export function submitQuestion(text: string, origin: Origin | null) {
  const submission = { text, origin };
  if (phase === "landing") {
    history.pushState({ phase: "chat" }, "", "/chat");
    document.title = site.meta.chatTitle;
    setPhase("chat");
    scrollTo({ top: 0 });
  }
  if (submitListeners.size === 0) pending = submission;
  submitListeners.forEach((listener) => listener(submission));
}

export function returnToLanding() {
  if (location.pathname !== "/") history.pushState({ phase: "landing" }, "", "/");
  document.title = site.meta.title;
  setPhase("landing");
}

export function onSubmit(listener: (submission: Submission) => void) {
  submitListeners.add(listener);
  if (pending) {
    listener(pending);
    pending = null;
  }
  return () => {
    submitListeners.delete(listener);
  };
}

export const setTextAppearing = (value: boolean) => {
  if (appearing === value) return;
  appearing = value;
  phaseListeners.forEach((listener) => listener());
};

export const setBusy = (value: boolean) => {
  busy = value;
  phaseListeners.forEach((listener) => listener());
};

if (typeof window !== "undefined") {
  document.documentElement.dataset.phase = phase;
  addEventListener("popstate", () => (location.pathname === "/chat" ? setPhase("chat") : returnToLanding()));
}

const subscribe = (listener: () => void) => {
  phaseListeners.add(listener);
  return () => {
    phaseListeners.delete(listener);
  };
};

export const useChatPhase = () => useSyncExternalStore(subscribe, () => phase, () => "landing" as Phase);

export const useChatBusy = () => useSyncExternalStore(subscribe, () => busy, () => false);

export const useTextAppearing = () => useSyncExternalStore(subscribe, () => appearing || busy, () => false);
