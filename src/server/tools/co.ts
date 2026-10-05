import { z } from "zod";
import { clip, cromaTool } from "./kit";

const hour = 3600;
const year = z.number().int().min(1886).max(2100).nullish().describe("Año, solo si la persona lo menciona");

type Norm = { id: string; title: string; document_type: string; year: number; entity: string; summary: string | null; issued_at: string | null; official_url: string };
type Ruling = { id: string; number: string; type: string; ruling_date: string; summary: string | null; decision: string | null; official_url: string };
type Doctrine = { document_id: string; title: string; document_type: string; year: string; summary: string | null; url: string };

export const norms = cromaTool("normas", {
  description:
    "Gestor Normativo de Función Pública: leyes, decretos, resoluciones, conceptos y circulares de Colombia, por palabras clave. Rápida y sin cuota estricta. Úsala para preguntas sobre qué dice la ley o qué norma regula un tema.",
  input: z.object({
    query: z.string().min(2).max(200).describe("Palabras clave del tema o la norma, p. ej. \"licencia de paternidad\" o \"ley 1581\""),
    document_type: z.enum(["ley", "decreto", "resolucion", "concepto", "circular-externa", "sentencia"]).nullish(),
    year,
  }),
  path: "/co/funcion-publica/norms-search/v1",
  ttl: 12 * hour,
  body: ({ query, document_type, year }) => ({ query, document_type, year, per_page: 6 }),
  shape: (data: { total: number; results: Norm[] }) => ({
    results: {
      total: data.total,
      norms: data.results.map((norm) => ({
        id: norm.id,
        title: norm.title,
        type: norm.document_type,
        entity: norm.entity,
        issued: norm.issued_at,
        summary: clip(norm.summary, 420),
        url: norm.official_url,
      })),
    },
    sources: data.results.map((norm) => ({ title: `${norm.title} · Función Pública`, url: norm.official_url })),
  }),
});

export const readNorm = cromaTool("leer_norma", {
  description: "Texto de una norma del Gestor Normativo por su id (de un resultado de normas). Úsala solo si necesitas citar artículos concretos.",
  input: z.object({ norm_id: z.string().min(1).max(20) }),
  path: "/co/funcion-publica/norm/v1",
  ttl: 7 * 24 * hour,
  body: ({ norm_id }) => ({ norm_id, limit: 12000 }),
  shape: ({ norm }: { norm: { title: string; official_url: string; amendments?: { description: string }[]; content?: { text?: string } } | null }) => ({
    results: norm ? { title: norm.title, url: norm.official_url, amendments: norm.amendments?.slice(0, 8).map((entry) => entry.description), text: clip(norm.content?.text, 12000) } : null,
    sources: norm ? [{ title: `${norm.title} · Función Pública`, url: norm.official_url }] : [],
  }),
});

export const constitutionalRulings = cromaTool("jurisprudencia_constitucional", {
  description:
    "Sentencias de la Corte Constitucional (tutela T, constitucionalidad C, unificación SU) desde 1992. Úsala para derechos fundamentales, tutelas y precedentes.",
  input: z.object({
    query: z.string().min(2).max(200).describe("Tema o derecho, p. ej. \"tutela entrega de medicamentos EPS\""),
    type: z.enum(["T", "C", "SU"]).nullish(),
    year,
  }),
  path: "/co/corte-constitucional/rulings-search/v1",
  ttl: 12 * hour,
  body: ({ query, type, year }) => ({ query, type, year, per_page: 5 }),
  shape: (data: { total: number; results: Ruling[] }) => ({
    results: data.results.map((ruling) => ({
      number: ruling.number,
      type: ruling.type,
      date: ruling.ruling_date,
      summary: clip(ruling.summary, 520),
      decision: clip(ruling.decision, 280),
      url: ruling.official_url,
    })),
    sources: data.results.map((ruling) => ({ title: `Sentencia ${ruling.number} · Corte Constitucional`, url: ruling.official_url })),
  }),
});

export const taxDoctrine = cromaTool("doctrina_dian", {
  description: "Doctrina y normativa tributaria de la DIAN (oficios, conceptos, decretos). Úsala para impuestos, RUT, régimen simple, renta, IVA y facturación.",
  input: z.object({ query: z.string().min(2).max(200), year: z.string().regex(/^\d{4}$/).nullish() }),
  path: "/co/dian/doctrina-search/v1",
  ttl: 12 * hour,
  body: ({ query, year }) => ({ query, year, per_page: 6 }),
  shape: (data: { total: number; results: Doctrine[] }) => ({
    results: data.results.map((entry) => ({ title: entry.title, type: entry.document_type, year: entry.year, summary: clip(entry.summary, 300), url: entry.url })),
    sources: data.results.map((entry) => ({ title: `${entry.title} · DIAN`, url: entry.url })),
  }),
});
