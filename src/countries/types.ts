import type { Detector } from "../lib/pii";

export type HeroCard = { slug: string; title: string; prompt: string; alt: string; entity?: string; image?: string; tone?: readonly [string, string, string] };

export type FeatureRow = { key: "ask" | "privacy" | "sources" | "browser"; title: string; body: string; cta: string; href?: string };

export type Entity = { name: string; short: string; iconFrom?: string };

export type Link = { label: string; href: string };

export type Site = {
  code: string;
  lang: string;
  locale: string;
  brand: { name: string; tagline: string; notice: string; noticeShort: string; disclaimer: string; poweredBy: string; handledBy: string };
  meta: { title: string; chatTitle: string; description: string };
  hero: { greeting: string; subtitle: string; tryPrefix: string; cards: readonly HeroCard[] };
  manifesto: { lead: string; beforeSources: string; beforePrivacy: string; afterPrivacy: string; flag: readonly string[] };
  features: readonly FeatureRow[];
  orbit: readonly { label: string; domain: string }[];
  showcase: readonly string[];
  entities: Record<string, Entity>;
  officialSuffixes: readonly string[];
  pii: readonly Detector[];
  nav: { primary: readonly Link[]; legal: readonly Link[] };
  ui: Record<
    | "askAnything"
    | "describe"
    | "ask"
    | "send"
    | "stop"
    | "examples"
    | "example"
    | "prev"
    | "next"
    | "play"
    | "pause"
    | "preparing"
    | "ready"
    | "conversation"
    | "messages"
    | "copy"
    | "close"
    | "source"
    | "thanks"
    | "thanksBody"
    | "actions"
    | "copied"
    | "good"
    | "bad"
    | "unrate"
    | "sources"
    | "officialSources"
    | "unverified"
    | "newTab"
    | "menu"
    | "closeMenu"
    | "followUps"
    | "piiBlocked"
    | "rateLimited"
    | "unavailable"
    | "flagLabel"
    | "flagDone"
    | "badges"
    | "fingerprint"
    | "fingerprintDone"
    | "orbitPlay"
    | "orbitPause"
    | "star"
    | "starDone",
    string
  >;
  pending: Record<"thinking" | "searching" | "reviewing" | "longer", readonly string[]>;
  disclaimers: { privacy: { title: string; items: readonly { heading: string; body: string }[] }; ai: { title: string; items: readonly { heading: string; body: string }[] } };
};
