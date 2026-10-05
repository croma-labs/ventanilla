import type { APIRoute } from "astro";
import { pathOf, published } from "../lib/tramites";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://gov.usecroma.com");
  const latest = published.map((tramite) => tramite.verifiedAt).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const entries = [
    { path: "/", lastmod: latest, priority: "1.0" },
    { path: "/tramites", lastmod: latest, priority: "0.9" },
    ...published.map((tramite) => ({ path: pathOf(tramite.slug), lastmod: tramite.verifiedAt, priority: "0.8" })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => `  <url><loc>${new URL(entry.path, origin).href}</loc><lastmod>${entry.lastmod}</lastmod><priority>${entry.priority}</priority></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
