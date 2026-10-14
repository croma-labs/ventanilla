import type { Detector } from "../lib/pii";

export type HeroCard = { slug: string; title: string; prompt: string; alt: string; entity?: string; image?: string; tone?: readonly [string, string, string] };

export type FeatureRow = { key: "ask" | "privacy" | "sources" | "browser"; title: string; body: string; cta: string; href?: string };

export type Entity = { name: string; short: string; iconFrom?: string };

export type Link = { label: string; href: string };

export type Chrome = {
  skip: string;
  home: string;
  menu: string;
  closeMenu: string;
  notice: string;
  noticeShort: string;
  disclaimer: string;
  poweredBy: string;
  nav: { primary: readonly Link[]; legal: readonly Link[] };
};

export type Tramite = { slug: string; category: string; title: string; question: string; entity: string; domains: readonly string[]; image?: string; hold?: string };

export type TramiteContent = { answer: string; sources: { title: string; url: string }[]; verifiedAt: string; claims: number; supported: number };

export type Site = {
  code: string;
  country: string;
  currency: string;
  timeZone: string;
  lang: string;
  locale: string;
  brand: { name: string; tagline: string; notice: string; noticeShort: string; disclaimer: string; poweredBy: string; handledBy: string };
  meta: { title: string; chatTitle: string; description: string; keywords: readonly string[]; publisher: { name: string; url: string }; repo?: { url: string; label: string } };
  hero: { greeting: string; subtitle: string; tryPrefix: string; cards: readonly HeroCard[] };
  manifesto: { lead: string; beforeSources: string; beforePrivacy: string; afterPrivacy: string; flag: readonly string[] };
  features: readonly FeatureRow[];
  orbit: readonly { label: string; domain: string }[];
  showcase: readonly string[];
  tramitesPage: {
    title: string;
    heading: string;
    intro: string;
    description: string;
    tail: string;
    home: string;
    suffix: string;
    verified: string;
    sources: string;
    answer: string;
    askTitle: string;
    askBody: string;
    askCta: string;
    related: string;
    popular: string;
    all: string;
    disclaimer: string;
    categories: Record<string, string>;
  };
  entities: Record<string, Entity>;
  officialSuffixes: readonly string[];
  /** Fetch icons of official sites missing from icons.json; off where most sites share the national seal. */
  liveIcons: boolean;
  pii: readonly Detector[];
  nav: { primary: readonly Link[]; legal: readonly Link[] };
  /** The site in English: the frame of the pages that have an English version, and the chat when a visitor writes in English. */
  english?: English;
  ui: Record<
    | "askAnything"
    | "answered"
    | "answeredOne"
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
    | "orbit"
    | "orbitPlay"
    | "orbitPause"
    | "star"
    | "starDone",
    string
  >;
  pending: Record<"thinking" | "searching" | "reviewing" | "longer", readonly string[]>;
  disclaimers: { privacy: { title: string; items: readonly { heading: string; body: string }[] }; ai: { title: string; items: readonly { heading: string; body: string }[] } };
};

export type English = Chrome & {
  chatTitle: string;
  ui: Partial<Site["ui"]>;
  pending: Site["pending"];
  disclaimers: Site["disclaimers"];
};
