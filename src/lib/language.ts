import { site } from "@country/site";
import { useSyncExternalStore } from "react";
import type { Chrome, Site, Translation } from "../countries/types";
import { chromeOf } from "./chrome";
import type { Lang } from "./turismo/labels";

export type Language = Lang;

export type Copy = { chrome: Chrome; ui: Site["ui"]; pending: Site["pending"]; disclaimers: Site["disclaimers"]; chatTitle: string };

const translation = (language: Language): Translation | undefined => (language === "es" ? undefined : site.languages?.[language]);

/** The languages the country's site speaks, its own first. */
export const spoken = (): Language[] => ["es", ...(Object.keys(site.languages ?? {}) as Language[])];

const listeners = new Set<() => void>();
const fromPage = (): Language => {
  if (typeof document === "undefined") return "es";
  const code = document.documentElement.lang.slice(0, 2) as Language;
  return translation(code) ? code : "es";
};
let current: Language = fromPage();

/** The language the visitor is writing in; the chat speaks it back where the country has that language. */
export function setLanguage(next: Language) {
  if (next === current || (next !== "es" && !translation(next))) return;
  current = next;
  document.documentElement.lang = next === "es" ? site.locale : next;
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
  const other = translation(language);
  return {
    chrome: chromeOf(language),
    ui: other ? { ...site.ui, ...other.ui } : site.ui,
    pending: other?.pending ?? site.pending,
    disclaimers: other?.disclaimers ?? site.disclaimers,
    chatTitle: other?.chatTitle ?? site.meta.chatTitle,
  };
}

/** The interface text in the visitor's language. */
export const useCopy = () => copyOf(useLanguage());
