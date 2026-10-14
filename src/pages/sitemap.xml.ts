import type { APIRoute } from "astro";
import { site as country } from "@country/site";
import { catalog, DEPARTMENTS, departmentPath, placePath, places } from "../lib/turismo/catalog";
import { pathOf, published } from "../lib/tramites";

/** The /turismo pages, where the country has them. */
function turismo() {
  if (country.code !== "sv" || places.length === 0) return [];
  const synced = catalog.syncedAt.slice(0, 10);
  return [
    { path: "/turismo", lastmod: synced, priority: "0.9" },
    { path: "/turismo/explorar", lastmod: synced, priority: "0.8" },
    { path: "/turismo/eventos", lastmod: synced, priority: "0.8" },
    { path: "/turismo/guias", lastmod: synced, priority: "0.6" },
    ...DEPARTMENTS.map((name) => ({ path: departmentPath(name), lastmod: synced, priority: "0.7" })),
    ...places.filter((place) => place.kind !== "guide").map((place) => ({ path: placePath(place), lastmod: place.updatedAt.slice(0, 10), priority: place.kind === "destination" || place.kind === "attraction" ? "0.7" : "0.5" })),
  ];
}

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://gov.usecroma.com");
  const latest = published.map((tramite) => tramite.verifiedAt).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const entries = [
    { path: "/", lastmod: latest, priority: "1.0" },
    { path: "/tramites", lastmod: latest, priority: "0.9" },
    ...published.map((tramite) => ({ path: pathOf(tramite.slug), lastmod: tramite.verifiedAt, priority: "0.8" })),
    ...turismo(),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => `  <url><loc>${new URL(entry.path, origin).href}</loc><lastmod>${entry.lastmod}</lastmod><priority>${entry.priority}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
