import { z } from "zod";
import { clip, cromaTool } from "./kit";

const hour = 3600;
const year = z.number().int().min(1821).max(2100).nullish().describe("Año, solo si la persona lo menciona");

type Decree = { id: string; number: string; type: string; title: string; summary: string | null; issue_date: string | null; official_url: string };
type Place = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  themes: string[];
  registered: boolean;
  department: string | null;
  municipality: string | null;
  region: string | null;
  languages: string[];
  hours: string | null;
  phones: string[];
  address: string | null;
  website: string | null;
  official_url: string;
  description?: string | null;
  summary?: string | null;
};
type TourismEvent = { id: string; slug: string; name: string; start_date: string | null; end_date: string | null; venue: string | null; department: string | null; links: string[]; official_url: string };

const departments = ["Ahuachapán", "Cabañas", "Chalatenango", "Cuscatlán", "La Libertad", "La Paz", "La Unión", "Morazán", "San Miguel", "San Salvador", "San Vicente", "Santa Ana", "Sonsonate", "Usulután"] as const;

const kinds: readonly (readonly [RegExp, string])[] = [
  [/\b(gu[ií]as?|guide|tour guide)\b/i, "guide"],
  [/\b(escuelas? de surf|clases? de surf|surf school|surf lessons?)\b/i, "surf_school"],
  [/\b(hotel(es)?|hostal(es)?|hospedaje|alojamiento|dormir|caba[ñn]as?|posada|lodging|hostel|stay|sleep)\b/i, "lodging"],
  [/\b(restaurantes?|comer|comida|cafeter[ií]a|pupuser[ií]a|restaurant|food|eat)\b/i, "restaurant"],
  [/\b(transporte|shuttle|transfer|taxi|bus)\b/i, "transport"],
  [/\b(museos?|parques?|sitios? tur[ií]sticos?|museum|park)\b/i, "attraction"],
];

const themes: readonly (readonly [RegExp, string])[] = [
  [/\bbitcoin\b/i, "bitcoin"],
  [/\bsurf city\b/i, "surf_city"],
  [/\b(arqueol[oó]gic|ruinas|mayas?|ruins|archaeolog)/i, "archaeology"],
  [/\b(termales|bienestar|wellness|hot springs)\b/i, "wellness"],
];

const languages: readonly (readonly [RegExp, string])[] = [
  [/\b(ingl[eé]s|english)\b/i, "en"],
  [/\b(franc[eé]s|french)\b/i, "fr"],
  [/\b(italiano|italian)\b/i, "it"],
  [/\b(alem[aá]n|german)\b/i, "de"],
  [/\b(portugu[eé]s|portuguese)\b/i, "pt"],
];

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The router hands datasets one keyword query; the directory's filters are read back out of it. */
export function placeFilters(query: string) {
  const department = departments.find((name) => new RegExp(`(?<!playa )\\b${fold(name)}\\b`).test(fold(query)));
  const kind = kinds.find(([pattern]) => pattern.test(query))?.[1];
  const theme = themes.find(([pattern]) => pattern.test(query))?.[1];
  const language = kind === "guide" ? languages.find(([pattern]) => pattern.test(query))?.[1] : undefined;
  const rest = [...kinds, ...themes, ...languages]
    .reduce((text, [pattern]) => text.replace(new RegExp(pattern.source, "gi"), " "), query)
    .replace(department ? new RegExp(department, "i") : /$^/, " ")
    .replace(/\b(cerca de|en|de|del|la|el|los|las|que|hablen?|speak(s|ing)?|near|in|the|a|un|una|para|donde|d[oó]nde|playa de)\b/gi, " ")
    .replace(/\b(destinos?|lugares?|sitios?|visitar|turismo|tur[ií]stic[oa]s?|recomendad[oa]s?|mejores?|places?|visit|things to do|best)\b/gi, " ")
    .replace(kind ? /\bplayas?\b/gi : /$^/, " ")
    .replace(/[¿?¡!,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const name = department && fold(rest) === fold(department) ? "" : rest;
  return { query: name || undefined, kind, theme, department, language };
}

const placeLine = (place: Place) =>
  [
    place.summary,
    place.region,
    place.address,
    place.hours && `Horario: ${place.hours}`,
    place.phones.length ? `Tel. ${place.phones.slice(0, 2).join(", ")}` : null,
    place.website && `Sitio: ${place.website}`,
    place.languages.length ? `Idiomas: ${place.languages.join(", ")}` : null,
    place.registered ? "Inscrito en el Registro Nacional de Turismo" : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** The dates a question about the agenda means, in El Salvador's time: this weekend, today, this week or this month. */
function when(query: string): { from_date?: string; to_date?: string } {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador" }).format(new Date());
  const day = new Date(`${today}T12:00:00Z`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const plus = (days: number) => iso(new Date(day.getTime() + days * 86_400_000));
  const weekday = day.getUTCDay();
  if (/fin de semana|weekend/i.test(query)) return { from_date: weekday === 0 || weekday === 6 ? today : plus(5 - weekday), to_date: plus(weekday === 0 ? 0 : 7 - weekday) };
  if (/\b(hoy|today)\b/i.test(query)) return { from_date: today, to_date: today };
  if (/esta semana|this week/i.test(query)) return { from_date: today, to_date: plus(weekday === 0 ? 0 : 7 - weekday) };
  if (/este mes|this month/i.test(query)) return { from_date: today, to_date: iso(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0, 12))) };
  const month = MONTHS.findIndex((names) => names.some((name) => new RegExp(`\\b${name}\\b`, "i").test(fold(query))));
  if (month >= 0) {
    const year = day.getUTCFullYear() + (month < day.getUTCMonth() ? 1 : 0);
    const first = iso(new Date(Date.UTC(year, month, 1, 12)));
    return { from_date: first < today ? today : first, to_date: iso(new Date(Date.UTC(year, month + 1, 0, 12))) };
  }
  return {};
}

const longDate = (iso: string) => new Intl.DateTimeFormat("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

const MONTHS = [
  ["enero", "january"],
  ["febrero", "february"],
  ["marzo", "march"],
  ["abril", "april"],
  ["mayo", "may"],
  ["junio", "june"],
  ["julio", "july"],
  ["agosto", "august"],
  ["septiembre", "setiembre", "september"],
  ["octubre", "october"],
  ["noviembre", "november"],
  ["diciembre", "december"],
];

/** Tourism answers link to Ventanilla's own /turismo pages, built from the same official directory. */
const turismo = (path: string) => new URL(path, import.meta.env.SITE ?? "https://sv.usecroma.com").href;
const placeUrl = (place: Pick<Place, "slug" | "kind">) => turismo(place.kind === "guide" ? `/turismo/guias#${place.slug}` : `/turismo/lugar/${place.slug}`);

const where = (item: { municipality?: string | null; department: string | null }) => [item.municipality, item.department].filter(Boolean).join(", ");
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

export const tourismPlaces = cromaTool("turismo", {
  description:
    "Directorio oficial de turismo del Ministerio de Turismo de El Salvador: destinos, playas, sitios turísticos, hoteles y alojamiento, restaurantes, transporte turístico, escuelas de surf y guías de turismo certificados, con departamento, municipio y contactos de los negocios.",
  input: z.object({ query: z.string().min(2).max(200).describe("Qué y dónde, p. ej. \"hotel El Tunco\", \"guía inglés Santa Ana\", \"destinos bitcoin\"") }),
  path: "/sv/mitur-sv/places-search/v1",
  ttl: 12 * hour,
  body: ({ query }) => ({ ...placeFilters(query), per_page: 8 }),
  cacheKey: (body) => `summaries:${JSON.stringify(body)}`,
  shape: (data: { total: number; results: Place[] }) => ({
    results: {
      total: data.total,
      places: data.results.map((place) => ({
        id: place.id,
        title: place.name,
        kind: place.kind,
        where: where(place),
        summary: clip(placeLine(place), 420),
        url: placeUrl(place),
      })),
    },
    sources: data.results.map((place) => ({ title: `${place.name} · Turismo en El Salvador`, url: placeUrl(place) })),
  }),
});

export const tourismPlace = cromaTool("lugar_turistico", {
  description: "Ficha completa de un lugar del directorio oficial de turismo por su id (de un resultado de turismo): descripción, horarios, contactos.",
  input: z.object({ place_id: z.string().min(1).max(300) }),
  path: "/sv/mitur-sv/place/v1",
  ttl: 24 * hour,
  body: ({ place_id }) => ({ place_id }),
  shape: ({ place }: { place: Place | null }) => ({
    results: place ? { title: place.name, url: placeUrl(place), text: [place.description, placeLine(place)].filter(Boolean).join("\n") } : null,
    sources: place ? [{ title: `${place.name} · Turismo en El Salvador`, url: placeUrl(place) }] : [],
  }),
});

export const tourismEvents = cromaTool("eventos_turismo", {
  description: "Agenda oficial del Ministerio de Turismo de El Salvador: festivales, ferias, conciertos y eventos culturales que aún no terminan, con fechas, lugar y departamento.",
  input: z.object({ query: z.string().min(2).max(200).describe("Tipo de evento o lugar, p. ej. \"festival Suchitoto\", \"eventos San Salvador\"") }),
  path: "/sv/mitur-sv/events-search/v1",
  ttl: 6 * hour,
  body: ({ query }) => {
    const department = departments.find((name) => new RegExp(`\\b${fold(name)}\\b`).test(fold(query)));
    const text = query
      .replace(department ? new RegExp(department, "i") : /$^/, " ")
      .replace(/\b(fin de semana|weekend|esta semana|this week|este mes|this month|hoy|today|pr[oó]xim[oa]s?|upcoming|soon|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, " ")
      .replace(/\bel salvador\b/gi, " ")
      .replace(/\b(eventos?|agenda|actividades|qu[eé] hay|events?|what'?s on|happening|festivales|festivals?|ferias?|fairs?|conciertos?|concerts?|shows?|espect[aá]culos?|culturales?|cultural|things to do)\b/gi, " ")
      .replace(/\b(what|which|are|is|on|and|or|the|a|to|for|any|there|este|esta|this|in|en|de|del|el|la|los|las|y|o|hay|qu[eé]|cu[aá]les)\b/gi, " ")
      .replace(/[¿?¡!,.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { query: text.length > 2 ? text : undefined, department, ...when(query), per_page: 8 };
  },
  shape: (data: { total: number; from_date: string; to_date: string | null; results: TourismEvent[] }) => ({
    results: {
      total: data.total,
      period: {
        title: "Agenda de turismo de El Salvador",
        summary: `Periodo consultado en la agenda oficial: ${longDate(data.from_date)}${data.to_date ? ` al ${longDate(data.to_date)}` : " en adelante"}. Eventos en ese periodo: ${data.total}.`,
        url: turismo("/turismo/eventos"),
      },
      events: data.results.map((event) => ({
        title: event.name,
        summary: [event.start_date === event.end_date ? event.start_date : `${event.start_date} a ${event.end_date}`, event.venue, event.department].filter(Boolean).join(" · "),
        url: turismo(`/turismo/eventos#${event.slug}`),
      })),
    },
    sources: data.results.map((event) => ({ title: `${event.name} · Agenda de turismo`, url: turismo(`/turismo/eventos#${event.slug}`) })),
  }),
});
