import type { APIRoute } from "astro";
import { site as country } from "@country/site";
import { catalog, DEPARTMENTS, departmentPath, LANGS, LOCALE, placePath, places, sectionPath, type Lang } from "../lib/turismo/catalog";
import { pathOf, published } from "../lib/tramites";

type Entry = { path: string; lastmod: string; priority: string; alternates?: { hreflang: string; path: string }[] };

/** The tourism pages, where the country has them, each listed in both languages with its twin. */
function turismo(): Entry[] {
  if (country.code !== "sv" || places.length === 0) return [];
  const synced = catalog.syncedAt.slice(0, 10);
  const pages: { path: (lang: Lang) => string; lastmod: string; priority: string }[] = [
    { path: (lang) => sectionPath("home", lang), lastmod: synced, priority: "0.9" },
    { path: (lang) => sectionPath("explore", lang), lastmod: synced, priority: "0.8" },
    { path: (lang) => sectionPath("events", lang), lastmod: synced, priority: "0.8" },
    { path: (lang) => sectionPath("guides", lang), lastmod: synced, priority: "0.6" },
    ...DEPARTMENTS.map((name) => ({ path: (lang: Lang) => departmentPath(name, lang), lastmod: synced, priority: "0.7" })),
    ...places
      .filter((place) => place.kind !== "guide")
      .map((place) => ({ path: (lang: Lang) => placePath(place, lang), lastmod: place.updatedAt.slice(0, 10), priority: place.kind === "destination" || place.kind === "attraction" ? "0.7" : "0.5" })),
  ];
  const hreflang = (lang: Lang) => (lang === "en" ? "en" : LOCALE[lang]);
  return pages.flatMap((page) => {
    const alternates = LANGS.map((lang) => ({ hreflang: hreflang(lang), path: page.path(lang) }));
    return LANGS.map((lang) => ({ path: page.path(lang), lastmod: page.lastmod, priority: page.priority, alternates }));
  });
}

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://gov.usecroma.com");
  const at = (path: string) => new URL(path, origin).href;
  const latest = published.map((tramite) => tramite.verifiedAt).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const entries: Entry[] = [
    { path: "/", lastmod: latest, priority: "1.0" },
    { path: "/tramites", lastmod: latest, priority: "0.9" },
    ...published.map((tramite) => ({ path: pathOf(tramite.slug), lastmod: tramite.verifiedAt, priority: "0.8" })),
    ...turismo(),
  ];
  const links = (entry: Entry) => (entry.alternates ?? []).map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${at(alternate.path)}"/>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries
    .map((entry) => `  <url><loc>${at(entry.path)}</loc><lastmod>${entry.lastmod}</lastmod><priority>${entry.priority}</priority>${links(entry)}</url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
