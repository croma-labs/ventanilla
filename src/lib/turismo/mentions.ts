import type { Lang } from "./labels";

export type Mentions = { lang: Lang; places: string[]; events: string[] };

const PLACE = /(?:https?:\/\/[^/\s)]+)?\/(turismo\/lugar|tourism\/place)\/([a-z0-9-]+)/g;
const EVENT = /(?:https?:\/\/[^/\s)]+)?\/(turismo\/eventos|tourism\/events)#([a-z0-9-]+)/g;
const ENGLISH = /\/tourism(\/|\b)/;
const LIMIT = 8;

const unique = (values: string[]) => [...new Set(values)].slice(0, LIMIT);

/** The places and events a text links to, in the order it names them, and the language of those links. */
export function mentionsOf(text: string): Mentions {
  return {
    lang: ENGLISH.test(text) ? "en" : "es",
    places: unique([...text.matchAll(PLACE)].map((match) => match[2])),
    events: unique([...text.matchAll(EVENT)].map((match) => match[2])),
  };
}

/** What a tourism answer shows: the places it names (or, naming none, the ones its tools found) and every event either holds. */
export function tourismOf(answer: string, found: string[]): Mentions | undefined {
  const named = mentionsOf(answer);
  const behind = mentionsOf(found.join(" "));
  const places = named.places.length ? named.places : behind.places.slice(0, 6);
  const events = unique([...named.events, ...behind.events]);
  if (!places.length && !events.length) return undefined;
  return { lang: ENGLISH.test(answer) || ENGLISH.test(found.join(" ")) ? "en" : "es", places, events };
}
