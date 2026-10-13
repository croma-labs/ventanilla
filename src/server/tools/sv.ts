import { z } from "zod";
import { clip, cromaTool } from "./kit";

const hour = 3600;
const year = z.number().int().min(1821).max(2100).nullish().describe("Año, solo si la persona lo menciona");

type Decree = { id: string; number: string; type: string; title: string; summary: string | null; issue_date: string | null; official_url: string };
type Ruling = { id: string; registration_number: string; ruling_date: string; court: string; type: string; decision: string | null; facts: string | null; official_url: string };

export const decrees = cromaTool("decretos", {
  description:
    "Decretos de la Asamblea Legislativa de El Salvador: leyes, códigos, reglamentos y decretos, por palabras clave. Úsala para preguntas sobre qué dice la ley o qué norma regula un tema.",
  input: z.object({
    query: z.string().min(2).max(200).describe("Palabras clave del tema o la norma, p. ej. \"ley del registro del estado familiar\""),
    type: z.enum(["Decreto", "Ley", "Código", "Reglamento"]).nullish(),
    year,
  }),
  path: "/sv/asamblea-sv/decrees-search/v1",
  ttl: 12 * hour,
  body: ({ query, type, year }) => ({ query, type, year, per_page: 6 }),
  shape: (data: { total: number; results: Decree[] }) => ({
    results: {
      total: data.total,
      decrees: data.results.map((decree) => ({
        id: decree.id,
        title: decree.title,
        type: decree.type,
        number: decree.number,
        issued: decree.issue_date,
        summary: clip(decree.summary, 420),
        url: decree.official_url,
      })),
    },
    sources: data.results.map((decree) => ({ title: `${decree.title} · Asamblea Legislativa`, url: decree.official_url })),
  }),
});

export const readDecree = cromaTool("leer_decreto", {
  description: "Texto de un decreto de la Asamblea Legislativa por su id (de un resultado de decretos). Úsala solo si necesitas citar artículos concretos.",
  input: z.object({ decree_id: z.string().min(1).max(20) }),
  path: "/sv/asamblea-sv/decree/v1",
  ttl: 7 * 24 * hour,
  body: ({ decree_id }) => ({ decree_id, limit: 12000 }),
  shape: ({ decree }: { decree: { title: string; official_url: string; content?: { text?: string } } | null }) => ({
    results: decree ? { title: decree.title, url: decree.official_url, text: clip(decree.content?.text, 12000) } : null,
    sources: decree ? [{ title: `${decree.title} · Asamblea Legislativa`, url: decree.official_url }] : [],
  }),
});

export const constitutionalRulings = cromaTool("jurisprudencia_constitucional", {
  description: "Resoluciones de la Sala de lo Constitucional de la Corte Suprema de Justicia: amparos, hábeas corpus e inconstitucionalidades.",
  input: z.object({ query: z.string().min(2).max(200).describe("Tema o derecho, p. ej. \"amparo derecho a la salud\""), year }),
  path: "/sv/csj-sv/rulings-search/v1",
  ttl: 12 * hour,
  body: ({ query, year }) => ({ query, year, court: "SALA DE LO CONSTITUCIONAL", per_page: 5 }),
  shape: (data: { total: number; results: Ruling[] }) => ({
    results: data.results.map((ruling) => ({
      number: ruling.registration_number,
      type: ruling.type,
      date: ruling.ruling_date,
      summary: clip(ruling.facts, 520),
      decision: clip(ruling.decision, 280),
      url: ruling.official_url,
    })),
    sources: data.results.map((ruling) => ({ title: `${ruling.type} ${ruling.registration_number} · Sala de lo Constitucional`, url: ruling.official_url })),
  }),
});
