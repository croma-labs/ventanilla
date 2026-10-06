import type { APIRoute } from "astro";
import { queryCount } from "../../server/stats";

export const prerender = false;

export const GET: APIRoute = async () =>
  Response.json({ queries: await queryCount() }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600" } });
