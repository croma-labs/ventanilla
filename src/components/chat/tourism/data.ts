import type { AgendaItem, Ficha } from "../../../lib/turismo/types";

const fichas = new Map<string, Promise<Ficha | null>>();
let agenda: Promise<AgendaItem[]> | null = null;

const json = <T>(url: string): Promise<T | null> =>
  fetch(url)
    .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
    .catch(() => null);

/** A place as the chat draws it, fetched once per page view. */
export function fichaOf(slug: string): Promise<Ficha | null> {
  if (!fichas.has(slug)) fichas.set(slug, json<Ficha>(`/turismo/ficha/${slug}.json`));
  return fichas.get(slug)!;
}

/** The upcoming agenda, fetched once per page view. */
export function agendaOf(): Promise<AgendaItem[]> {
  agenda ??= json<AgendaItem[]>("/turismo/agenda.json").then((items) => items ?? []);
  return agenda;
}
