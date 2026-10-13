import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL("/sitemap.xml", site ?? "https://gov.usecroma.com").href}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
