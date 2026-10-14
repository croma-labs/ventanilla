import { pageOf, type Lang } from "./labels";

export type Mentions = { lang: Lang; places: string[]; events: string[] };

const LINK = /(?:https?:\/\/[^/\s)"']+)?\/[^\s)"'\]]+/g;
const LIMIT = 8;

const unique = (values: string[]) => [...new Set(values)].slice(0, LIMIT);

/** The places and events a text links to, in the order it names them, and the language of those links. */
export function mentionsOf(text: string): Mentions {
  const pages = [...text.matchAll(LINK)].map((match) => pageOf(match[0])).filter((page) => page !== null);
  return {
    lang: pages[0]?.lang ?? "es",
    places: unique(pages.filter((page) => page.kind === "place").map((page) => page.slug)),
    events: unique(pages.filter((page) => page.kind === "event").map((page) => page.slug)),
  };
}

/** What a tourism answer shows: the places it names (or, naming none, the ones its tools found) and every event either holds. */
export function tourismOf(answer: string, found: string[], lang: Lang): Mentions | undefined {
  const named = mentionsOf(answer);
  const behind = mentionsOf(found.join(" "));
  const places = named.places.length ? named.places : behind.places.slice(0, 6);
  const events = unique([...named.events, ...behind.events]);
  if (!places.length && !events.length) return undefined;
  return { lang, places, events };
}
