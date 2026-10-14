import type { APIRoute } from "astro";
import { upcoming } from "../lib/turismo/catalog";
import type { AgendaItem } from "../lib/turismo/types";

/** The upcoming agenda as the chat draws it, fetched once when an answer names an event. */
export const GET: APIRoute = () => {
  const items: AgendaItem[] = upcoming().map(({ id, slug, name, start, end, venue, department, links }) => ({ id, slug, name, start, end, venue, department, links }));
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
