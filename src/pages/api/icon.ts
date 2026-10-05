import { site } from "@country/site";
import type { APIRoute } from "astro";
import { admit, anonymousKey } from "../../server/guard";
import { fetchIcon } from "../../server/icons";
import { store } from "../../server/store";

export const prerender = false;

type Cached = { data: string; type: string } | { none: true };

const official = (domain: string) => site.officialSuffixes.some((suffix) => (suffix.startsWith(".") ? domain.endsWith(suffix) : domain === suffix || domain.endsWith(`.${suffix}`)));

const headers = (type: string) => ({
  "Content-Type": type,
  "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "X-Content-Type-Options": "nosniff",
});

const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400" } });

export const GET: APIRoute = async ({ url, clientAddress }) => {
  const domain = (url.searchParams.get("d") ?? "").toLowerCase().replace(/^www\./, "");
  if (!official(domain) || domain.length > 120) return missing();
  const key = `icon:${domain}`;
  const cached = await store.get<Cached>(key).catch(() => null);
  if (cached && "none" in cached) return missing();
  if (cached) return new Response(Buffer.from(cached.data, "base64"), { headers: headers(cached.type) });
  if (!(await admit(await anonymousKey(clientAddress ?? "unknown", "icon"))).ok) return new Response(null, { status: 429, headers: { "Cache-Control": "no-store" } });
  const icon = await fetchIcon(domain);
  await store.set(key, icon ? { data: Buffer.from(icon.bytes).toString("base64"), type: icon.type } : { none: true }, icon ? 30 * 86400 : 86400).catch(() => undefined);
  return icon ? new Response(Buffer.from(icon.bytes), { headers: headers(icon.type) }) : missing();
};
