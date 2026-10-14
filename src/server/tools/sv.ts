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
  [/(?<!\p{L})(gu[ií]as?|guides?|tour guides?)(?!\p{L})/iu, "guide"],
  [/(?<!\p{L})(escuelas? de surf|clases? de surf|surf school|surf lessons?|escolas? de surf|aulas de surf|[ée]coles? de surf|cours de surf)(?!\p{L})/iu, "surf_school"],
  [/(?<!\p{L})(hotel(es)?|hot[ée]is|h[ôo]tels?|hostal(es)?|hospedaje|alojamento|alojamiento|h[ée]bergements?|logements?|dormir|caba[ñn]as?|posada|pousadas?|auberges?|g[îi]tes?|lodging|hostels?|stay|sleep|ficar)(?!\p{L})/iu, "lodging"],
  [/(?<!\p{L})(restaurantes?|restaurants?|comer|comida|manger|cuisine|cafeter[ií]a|pupuser[ií]a|food|eat)(?!\p{L})/iu, "restaurant"],
  [/(?<!\p{L})(transportes?|transports?|shuttle|navettes?|transfer|taxi|bus|autocarros?)(?!\p{L})/iu, "transport"],
  [/(?<!\p{L})(museos?|museus?|mus[ée]es?|parques?|parcs?|sitios? tur[ií]sticos?|museums?|parks?)(?!\p{L})/iu, "attraction"],
];

const themes: readonly (readonly [RegExp, string])[] = [
  [/\bbitcoin\b/i, "bitcoin"],
  [/\bsurf city\b/i, "surf_city"],
  [/(?<!\p{L})(arqueol[oó]gic|arqueolog|arch[ée]olog|ruinas|ruines|mayas?|ruins|archaeolog)/iu, "archaeology"],
  [/(?<!\p{L})(termales|termas|thermes|sources chaudes|bienestar|bem-estar|bien-[êe]tre|wellness|hot springs)(?!\p{L})/iu, "wellness"],
];

const languages: readonly (readonly [RegExp, string])[] = [
  [/(?<!\p{L})(ingl[eéê]s|english|anglais)(?!\p{L})/iu, "en"],
  [/(?<!\p{L})(franc[eéê]s|french|fran[çc]ais)(?!\p{L})/iu, "fr"],
  [/(?<!\p{L})(italiano|italian|italien)(?!\p{L})/iu, "it"],
  [/(?<!\p{L})(alem[aáã]n?o?|german|allemand)(?!\p{L})/iu, "de"],
  [/(?<!\p{L})(portugu[eéê]s|portuguese|portugais)(?!\p{L})/iu, "pt"],
];

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The router hands datasets one keyword query; the directory's filters are read back out of it. */
export function placeFilters(query: string) {
  const department = departments.find((name) => new RegExp(`(?<!playa )\\b${fold(name)}\\b`).test(fold(query)));
  const kind = kinds.find(([pattern]) => pattern.test(query))?.[1];
  const theme = themes.find(([pattern]) => pattern.test(query))?.[1];
  const language = kind === "guide" ? languages.find(([pattern]) => pattern.test(query))?.[1] : undefined;
  const rest = [...kinds, ...themes, ...languages]
    .reduce((text, [pattern]) => text.replace(new RegExp(pattern.source, "giu"), " "), query)
    .replace(department ? new RegExp(department, "i") : /$^/, " ")
    .replace(/(?<!\p{L})(cerca de|perto de|pr[èe]s de|en|em|de|del|do|da|dos|das|du|des|la|el|los|las|le|les|o|os|as|no|na|nos|nas|au|aux|à|que|hablen?|falam|parlent|speak(s|ing)?|near|in|the|a|un|una|um|uma|une|para|pour|dans|donde|d[oó]nde|onde|o[ùu]|playa de|praia de|plage de)(?!\p{L})/giu, " ")
    .replace(/(?<!\p{L})(destinos?|destinations?|lugares?|locais|s[ií]tios?|lieux|endroits|visitar|visiter|turismo|tourisme|tur[ií]stic[oa]s?|touristiques?|recomendad[oa]s?|recomendados?|mejores?|melhores?|meilleur(e?s)?|places?|visit|things to do|o que fazer|que faire|perto|pr[èe]s|cerca|fazer|faire|hacer|ver|voir|aller|ir|best)(?!\p{L})/giu, " ")
    .replace(kind ? /(?<!\p{L})(playas?|praias?|plages?)(?!\p{L})/giu : /$^/, " ")
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
  if (/fin de semana|fim de semana|week-?end/i.test(query)) return { from_date: weekday === 0 || weekday === 6 ? today : plus(5 - weekday), to_date: plus(weekday === 0 ? 0 : 7 - weekday) };
  if (/(?<!\p{L})(hoy|hoje|today|aujourd'hui)(?!\p{L})/iu.test(query)) return { from_date: today, to_date: today };
  if (/esta semana|this week|cette semaine/i.test(query)) return { from_date: today, to_date: plus(weekday === 0 ? 0 : 7 - weekday) };
  if (/este m[eê]s|this month|ce mois/i.test(query)) return { from_date: today, to_date: iso(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0, 12))) };
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
  ["enero", "january", "janeiro", "janvier"],
  ["febrero", "february", "fevereiro", "fevrier", "février"],
  ["marzo", "march", "marco", "março", "mars"],
  ["abril", "april", "avril"],
  ["mayo", "may", "maio", "mai"],
  ["junio", "june", "junho", "juin"],
  ["julio", "july", "julho", "juillet"],
  ["agosto", "august", "aout", "août"],
  ["septiembre", "setiembre", "september", "setembro", "septembre"],
  ["octubre", "october", "outubro", "octobre"],
  ["noviembre", "november", "novembro", "novembre"],
  ["diciembre", "december", "dezembro", "decembre", "décembre"],
];

/** Words that only say when, in the four languages the guide speaks; the dates come from them, the search text does not. */
const PERIODS = ["fin de semana", "fim de semana", "week-end", "weekend", "esta semana", "cette semaine", "this week", "este mes", "este mês", "ce mois", "this month", "hoy", "hoje", "aujourd'hui", "today", "pr[oó]xim[oa]s?", "prochaine?s?", "upcoming", "soon", "bient[ôo]t"];

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
      .replace(new RegExp(`(?<!\\p{L})(${[...PERIODS, ...MONTHS.flat()].join("|")})(?!\\p{L})`, "giu"), " ")
      .replace(/(?<!\p{L})(el salvador|le salvador|du salvador|salvador)(?!\p{L})/giu, " ")
      .replace(/(?<!\p{L})(eventos?|agenda|actividades|atividades|activit[ée]s|qu[eé] hay|events?|[ée]v[ée]nements?|what'?s on|happening|festivales|festivais|festivals?|ferias?|feiras?|foires?|fairs?|conciertos?|concertos?|concerts?|shows?|espect[aá]culos?|espet[aá]culos?|spectacles?|f[êe]tes?|culturales?|culturais|culturels?|cultural|things to do)(?!\p{L})/giu, " ")
      .replace(/(?<!\p{L})(what|which|are|is|on|and|or|the|a|to|for|any|there|este|esta|this|in|en|em|de|del|do|da|du|des|el|la|los|las|le|les|os|as|y|e|et|o|ou|hay|h[áa]|il y a|qu[eé]|quais|quels?|quelles?|cu[aá]les|ce|cette|à|au|no|na)(?!\p{L})/giu, " ")
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
