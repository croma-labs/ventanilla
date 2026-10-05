import { z } from "zod";
import { keywords } from "../normalize";
import { clip, cromaTool } from "./kit";

type SearchHit = { url: string; title: string | null; published_at: string | null; highlights?: string[] };

const hour = 3600;

export const webSearch = ({ hint, scope }: { hint: string; scope?: string }) =>
  cromaTool("buscar_web", {
    description: `Búsqueda web en vivo para guías prácticas actuales: requisitos, costos, pasos, dónde hacer un trámite. Cuota muy limitada: úsala como máximo una vez por pregunta, con una consulta concreta en español que incluya "${hint}".`,
    input: z.object({ query: z.string().min(3).max(200).describe(`Consulta concreta, p. ej. "requisitos pasaporte primera vez ${hint} 2026"`) }),
    path: "/global/web-search/v1",
    ttl: 24 * hour,
    quota: "web",
    cacheKey: (body) => `web:v2:${keywords(String(body.query))}`,
    cacheable: (data: { results: SearchHit[] }) => data.results.length > 0,
    body: ({ query }) => {
      const base = query.replace(/\bsite:\S+/gi, "").trim();
      return { query: [base, base.toLowerCase().includes(hint.toLowerCase()) || scope ? "" : hint, scope ?? ""].filter(Boolean).join(" ").slice(0, 300), limit: 8 };
    },
    shape: (data: { results: SearchHit[] }, { official }) => {
      const hits = data.results.filter((hit) => official(hit.url)).slice(0, 6);
      return {
        results: hits.map((hit) => ({
          title: hit.title,
          url: hit.url,
          date: hit.published_at,
          excerpt: clip(hit.highlights?.join(" "), 1400),
        })),
        sources: hits.map((hit) => ({ title: hit.title ?? new URL(hit.url).hostname, url: hit.url })),
      };
    },
  });

export const readPage = cromaTool("leer_pagina", {
  description: "Lee el texto completo de una página oficial (solo dominios del Estado) cuando los fragmentos de buscar_web no alcanzan para responder con precisión.",
  input: z.object({ url: z.url().describe("URL exacta tomada de un resultado anterior") }),
  path: "/global/extract/markdown/v1",
  ttl: 7 * 24 * hour,
  quota: "extract",
  refused: "Solo se pueden leer páginas oficiales del Estado.",
  body: ({ url }, { official }) => (official(url) ? { url, scope: "main", effort: "min", include_metadata: true } : null),
  shape: (data: { url: string; markdown: string; metadata?: { title?: string | null } | null }) => ({
    results: { url: data.url, text: clip(data.markdown, 9000) },
    sources: [{ title: data.metadata?.title ?? new URL(data.url).hostname, url: data.url }],
  }),
});
