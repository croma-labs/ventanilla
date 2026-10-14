import { site } from "@country/site";
import { useSyncExternalStore } from "react";
import type { Chrome, Site } from "../countries/types";
import { chromeOf } from "./chrome";

export type Language = "es" | "en";

export type Copy = { chrome: Chrome; ui: Site["ui"]; pending: Site["pending"]; disclaimers: Site["disclaimers"]; chatTitle: string };

const listeners = new Set<() => void>();
let current: Language = typeof document !== "undefined" && document.documentElement.lang.startsWith("en") && site.english ? "en" : "es";

/** The language the visitor is writing in; the chat speaks it back where the country has an English version. */
export function setLanguage(next: Language) {
  if (next === current || (next === "en" && !site.english)) return;
  current = next;
  document.documentElement.lang = next === "en" ? "en" : site.locale;
  listeners.forEach((listener) => listener());
}

export const getLanguage = () => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useLanguage = () => useSyncExternalStore(subscribe, getLanguage, () => "es" as Language);

export function copyOf(language: Language): Copy {
  const english = language === "en" ? site.english : undefined;
  return {
    chrome: chromeOf(language),
    ui: english ? { ...site.ui, ...english.ui } : site.ui,
    pending: english?.pending ?? site.pending,
    disclaimers: english?.disclaimers ?? site.disclaimers,
    chatTitle: english?.chatTitle ?? site.meta.chatTitle,
  };
}

/** The interface text in the visitor's language. */
export const useCopy = () => copyOf(useLanguage());
