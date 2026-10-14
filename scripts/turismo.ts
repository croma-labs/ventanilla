import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Catalog, Happening, Kind, Photo, Place, Point, Precision, Social, Theme } from "../src/lib/turismo/types.ts";

// Pulls El Salvador's official tourism directory and agenda from Croma into
// .turismo/catalog.json (gitignored) for the /turismo pages, and places each
// entry on the map. The directory publishes no coordinates: destinations and
// tourist sites are looked up by name, everything else sits at its town, and
// every lookup is kept in src/countries/sv/turismo-geo.json so a build only
// asks for what is new. Descriptions and hours are translated for /tourism the
// same way, once per text, into src/countries/sv/turismo-en.json.

const OUT_DIR = ".turismo";
const OUT = `${OUT_DIR}/catalog.json`;
const GEO = "src/countries/sv/turismo-geo.json";
const EN = "src/countries/sv/turismo-en.json";
const base = process.env.CROMA_API_URL ?? "https://api.croma.run";
const key = process.env.CROMA_API_KEY;
const onVercel = !!process.env.VERCEL;
const lookupBudget = Number(process.env.TURISMO_GEOCODE_MAX ?? (onVercel ? 40 : 800));
const translateBudget = Number(process.env.TURISMO_TRANSLATE_MAX ?? (onVercel ? 30 : 1000));
const groqKey = process.env.GROQ_API_KEY;
const TRANSLATOR = process.env.TURISMO_TRANSLATE_MODEL ?? "openai/gpt-oss-120b";
const PER_PAGE = 50;
const IN_FLIGHT = 4;
const SV = { south: 13.05, north: 14.5, west: -90.2, east: -87.6 };
const UPSTREAM_HOSTS = /(^|\.)(elsalvador\.travel|mitur\.gob\.sv|corsatur\.gob\.sv)$/i;

type RawPlace = {
  id: string;
  slug: string;
  name: string;
  kind: Kind;
  themes: string[];
  guide_level: Place["guideLevel"];
  registered: boolean;
  access: Place["access"];
  department: string | null;
  municipality: string | null;
  region: string | null;
  languages: string[];
  description?: string | null;
  hours: string | null;
  phones: string[];
  emails: string[];
  address: string | null;
  website: string | null;
  whatsapp: string | null;
  social_links: string[];
  photos?: { document_url: string; source_document_url: string }[];
  updated_at: string;
};

type RawEvent = { id: string; slug: string; name: string; start_date: string | null; end_date: string | null; venue: string | null; department: string | null; links: string[] };

type GeoEntry = { lat: number; lng: number } | null;

async function croma<T>(path: string, body: Record<string, unknown>, attempt = 1): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (response.ok) return ((await response.json()) as { data: T }).data;
  if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
    await sleep(attempt * 3000);
    return croma(path, body, attempt + 1);
  }
  throw new Error(`croma ${path} answered ${response.status}`);
}

async function pool<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(IN_FLIGHT, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await run(items[index]);
      }
    }),
  );
  return out;
}

/**
 * Every place, a page at a time. Croma counts matches only up to a cap and
 * says so (`total_is_exact: false`), so pages are read in batches until one
 * comes back short.
 */
async function allPlaces(): Promise<RawPlace[]> {
  type Page = { total: number; total_is_exact: boolean; results: RawPlace[] };
  const read = (page: number) => croma<Page>("/sv/mitur-sv/places-search/v1", { page, per_page: PER_PAGE });
  const first = await read(1);
  const places = [...first.results];
  for (let next = 2; first.results.length === PER_PAGE; next += IN_FLIGHT) {
    const batch = await pool(Array.from({ length: IN_FLIGHT }, (_, i) => next + i), read);
    for (const page of batch) places.push(...page.results);
    if (batch.some((page) => page.results.length < PER_PAGE)) break;
  }
  if (places.length < first.total) throw new Error(`listed ${places.length} of at least ${first.total} places`);
  if (new Set(places.map((place) => place.id)).size !== places.length) throw new Error("places repeated across pages");
  const detailed = await pool(
    places.filter((place) => place.kind === "destination" || place.kind === "attraction"),
    (place) => croma<{ place: RawPlace | null }>("/sv/mitur-sv/place/v1", { place_id: place.id }).then((data) => data.place),
  );
  const byId = new Map(detailed.filter((place): place is RawPlace => place !== null).map((place) => [place.id, place]));
  return places.map((place) => byId.get(place.id) ?? place);
}

async function allEvents(): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  for (let page = 1; ; page++) {
    const data = await croma<{ total_pages: number; results: RawEvent[] }>("/sv/mitur-sv/events-search/v1", { page, per_page: PER_PAGE });
    out.push(...data.results);
    if (page >= data.total_pages) return out;
  }
}

// ─── Contacts, ready to tap ───

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const withProtocol = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`);

const NETWORKS: readonly (readonly [RegExp, Social["network"]])[] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook|fb)\.com$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(twitter|x)\.com$/, "x"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
];

function social(url: string): Social | null {
  const href = withProtocol(url.trim()).replace(/^http:\/\//i, "https://");
  const host = hostOf(href);
  if (!host || UPSTREAM_HOSTS.test(host)) return null;
  const network = NETWORKS.find(([pattern]) => pattern.test(host))?.[1] ?? "web";
  const path = new URL(href).pathname.split("/").filter(Boolean);
  const handle = network === "web" ? host : (path[0] === "profile.php" ? "" : (path.find((segment) => !["pages", "p", "people"].includes(segment)) ?? "").replace(/^@/, ""));
  return { network, url: href, handle };
}

function website(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().split(/\s+/)[0];
  if (!/\./.test(candidate) || candidate.includes("@")) return null;
  const href = withProtocol(candidate);
  return UPSTREAM_HOSTS.test(hostOf(href)) ? null : href;
}

const digits = (value: string) => value.replace(/\D/g, "");

/** A phone as the directory writes it, as an international number: 8 digits are Salvadoran. */
function international(value: string): string | null {
  const number = digits(value);
  if (number.length === 8) return `+503${number}`;
  if (number.length === 11 && number.startsWith("503")) return `+${number}`;
  return number.length >= 8 ? `+${number}` : null;
}

function whatsapp(value: string | null, phones: readonly string[]): string | null {
  if (value && /wa\.me|whatsapp/i.test(value)) return withProtocol(value);
  const number = value ? international(value) : null;
  if (number) return `https://wa.me/${number.slice(1)}`;
  const mobile = phones.map(international).find((phone) => phone && /^\+503[67]/.test(phone));
  return mobile ? `https://wa.me/${mobile.slice(1)}` : null;
}

// ─── Where things are ───

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

async function loadGeo(): Promise<Record<string, GeoEntry>> {
  return existsSync(GEO) ? JSON.parse(await readFile(GEO, "utf8")) : {};
}

let lookups = 0;
let lastLookup = 0;

async function geocode(query: string, cache: Record<string, GeoEntry>): Promise<GeoEntry | undefined> {
  const cacheKey = fold(query);
  if (cacheKey in cache) return cache[cacheKey];
  if (lookups >= lookupBudget) return undefined;
  lookups++;
  await sleep(Math.max(0, 1100 - (Date.now() - lastLookup)));
  lastLookup = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, countrycodes: "sv", format: "jsonv2", limit: "1" })}`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Ventanilla/1.0 (https://sv.usecroma.com; turismo)", "Accept-Language": "es" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return undefined;
    const [hit] = (await response.json()) as { lat: string; lon: string }[];
    const point = hit ? { lat: Number(Number(hit.lat).toFixed(5)), lng: Number(Number(hit.lon).toFixed(5)) } : null;
    cache[cacheKey] = point && inside(point) ? point : null;
    return cache[cacheKey];
  } catch {
    return undefined;
  }
}

const inside = (point: { lat: number; lng: number }) => point.lat > SV.south && point.lat < SV.north && point.lng > SV.west && point.lng < SV.east;

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** Category words the directory sometimes files as a town. */
const NOT_A_TOWN = /^(alimentaci[oó]n|alojamiento|transporte|informaci[oó]n|recreaci[oó]n|avi[oó]n|turismo|servicio)$/i;

/**
 * The town a place is in: its tag when it is a real one, else what its address
 * names, either a district ("Distrito de Chiltiupán", the old municipality
 * since the 2024 reform) or the part just before the department.
 */
function townOf(place: RawPlace): string | null {
  if (place.municipality && !NOT_A_TOWN.test(place.municipality.trim())) return place.municipality;
  const address = place.address ?? "";
  const district = address.match(/distrito (?:de )?([^,.]+)/i)?.[1]?.trim();
  if (district) return district;
  const parts = address.split(",").map((part) => part.trim().replace(/\.$/, "")).filter(Boolean);
  const department = fold(place.department ?? "");
  const at = place.department ? parts.map((part) => fold(part)).lastIndexOf(department) : -1;
  const candidate = at > 0 ? parts[at - 1] : null;
  return candidate && candidate.length <= 30 && !/\d|km|calle|avenida|colonia|barrio|carretera|local|plaza|centro comercial/i.test(candidate) ? candidate : null;
}

async function locate(place: RawPlace, cache: Record<string, GeoEntry>): Promise<Point | null> {
  const department = place.department ? await geocode(`Departamento de ${place.department}, El Salvador`, cache) : null;
  const townName = townOf(place);
  const town = townName && place.department ? await geocode(`${townName}, ${place.department}, El Salvador`, cache) : null;
  if (place.kind === "destination" || place.kind === "attraction") {
    const anchor = town ?? department;
    const bare = place.name.replace(/^(parque natural|parque ecol[oó]gico|parque nacional|parque|turicentro|complejo tur[ií]stico|centro tur[ií]stico|museo de|museo)\s+/i, "").trim();
    const queries = [
      [place.name, townName, place.department, "El Salvador"],
      [place.name, place.department, "El Salvador"],
      [place.name, "El Salvador"],
      ...(bare !== place.name ? [[bare, place.department, "El Salvador"]] : []),
    ].map((parts) => parts.filter(Boolean).join(", "));
    for (const query of [...new Set(queries)]) {
      const name = await geocode(query, cache);
      if (name && (!anchor || km(name, anchor) < 45)) return { ...name, precision: "exact" };
    }
  }
  const at = (point: GeoEntry | undefined, precision: Precision): Point | null => (point ? { ...point, precision } : null);
  return at(town, "town") ?? at(department, "department");
}

// ─── The catalog ───

const LOWER_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al", "con", "por", "para", "o"]);

/** "HOTEL ESTERO Y MAR" -> "Hotel Estero y Mar"; names written with any lowercase are left as their owners wrote them. */
function tidyName(name: string): string {
  if (/\p{Ll}/u.test(name)) return name.trim();
  return name
    .trim()
    .toLocaleLowerCase("es")
    .split(/(\s+|-|\/)/)
    .map((word, index) => (index > 0 && LOWER_WORDS.has(word) ? word : /^(ii|iii|iv|rnt|sa|cv|sv|usa)$/.test(word) ? word.toUpperCase() : word.charAt(0).toLocaleUpperCase("es") + word.slice(1)))
    .join("");
}

/** A destination's own story; the "¿Dónde dormir?" contact dump after it is already in the directory, place by place. */
function story(text: string | null | undefined): string | null {
  if (!text) return null;
  const lines = text.split("\n");
  const cut = lines.findIndex((line) => /^\s*¿?\s*d[oó]nde\s+(dormir|comer|hospedarse|alojarse)\b/i.test(line));
  return (cut < 0 ? lines : lines.slice(0, cut)).join("\n").trim() || null;
}

const THEMES = new Set<Theme>(["surf_city", "bitcoin", "nature_adventure", "archaeology", "towns", "wellness", "regional"]);

function place(raw: RawPlace, point: Point | null): Place {
  const phones = raw.kind === "guide" ? [] : raw.phones;
  return {
    id: raw.id,
    slug: raw.slug,
    name: tidyName(raw.name),
    kind: raw.kind,
    themes: raw.themes.filter((theme): theme is Theme => THEMES.has(theme as Theme)),
    guideLevel: raw.guide_level,
    registered: raw.registered,
    access: raw.access,
    department: raw.department,
    municipality: townOf(raw),
    region: raw.region,
    languages: raw.languages,
    description: story(raw.description),
    hours: raw.hours,
    phones,
    emails: raw.kind === "guide" ? [] : raw.emails,
    address: raw.kind === "guide" ? null : raw.address,
    website: raw.kind === "guide" ? null : website(raw.website),
    whatsapp: raw.kind === "guide" ? null : whatsapp(raw.whatsapp, phones),
    socials: raw.kind === "guide" ? [] : raw.social_links.map(social).filter((link): link is Social => link !== null),
    photos: (raw.photos ?? []).map((photo): Photo => ({ src: photo.document_url, source: photo.source_document_url })),
    point,
    updatedAt: raw.updated_at,
  };
}

function happening(raw: RawEvent): Happening {
  const links = raw.links
    .map((url) => withProtocol(url))
    .filter((url) => !UPSTREAM_HOSTS.test(hostOf(url)))
    .map((url) => ({ url, label: social(url)?.network ?? "web" }));
  return { id: raw.id, slug: raw.slug, name: tidyName(raw.name), start: raw.start_date, end: raw.end_date, venue: raw.venue, department: raw.department, links };
}

/** Slugs are the directory's own; the rare one two entries share gets its id. */
function uniqueSlugs(places: Place[]): Place[] {
  const seen = new Map<string, number>();
  for (const entry of places) seen.set(entry.slug, (seen.get(entry.slug) ?? 0) + 1);
  return places.map((entry) => ((seen.get(entry.slug) ?? 0) > 1 ? { ...entry, slug: `${entry.slug}-${entry.id}` } : entry));
}

// ─── English ───

const TRANSLATE = [
  "You translate El Salvador's official tourism directory from Spanish into natural, polished US English for international travelers.",
  "Keep proper names in Spanish: towns, beaches, volcanoes, lakes, parks, festivals, businesses and dishes (pupusas, yuca frita). Translate generic words around them (playa El Tunco becomes El Tunco beach).",
  "Keep every line break, number, price, phone, time and URL exactly. Use a.m./p.m. times as written. Never use em dashes. Do not add, explain or summarize.",
  "Answer with the translation only.",
].join(" ");

const tidyEnglish = (text: string) =>
  text
    .replace(/\u2011/g, "-")
    .replace(/\s*\u2014\s*/g, ", ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

const fingerprint = (text: string) => createHash("sha256").update(text).digest("base64url").slice(0, 16);

let translations = 0;

async function english(text: string, cache: Record<string, string>): Promise<string | undefined> {
  const id = fingerprint(text);
  if (id in cache) return cache[id];
  if (!groqKey || translations >= translateBudget) return undefined;
  translations++;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: TRANSLATOR, reasoning_effort: "low", temperature: 0.2, messages: [{ role: "system", content: TRANSLATE }, { role: "user", content: text }] }),
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(attempt * 5000);
        continue;
      }
      if (!response.ok) return undefined;
      const answer = ((await response.json()) as { choices: { message: { content: string | null } }[] }).choices[0]?.message.content?.trim();
      if (!answer || answer.length < text.length * 0.5) return undefined;
      cache[id] = tidyEnglish(answer);
      return cache[id];
    } catch {
      await sleep(attempt * 3000);
    }
  }
  return undefined;
}

async function inEnglish(places: Place[]): Promise<Place[]> {
  const cache: Record<string, string> = existsSync(EN) ? JSON.parse(await readFile(EN, "utf8")) : {};
  const texts = [...new Set(places.flatMap((entry) => [entry.description, entry.hours]).filter((text): text is string => !!text))];
  await pool(texts, (text) => english(text, cache));
  const kept = new Set(texts.map(fingerprint));
  const sorted = Object.fromEntries(Object.entries(cache).filter(([id]) => kept.has(id)).sort(([a], [b]) => a.localeCompare(b)).map(([id, text]) => [id, tidyEnglish(text)]));
  await writeFile(EN, `${JSON.stringify(sorted, null, 1)}\n`);
  const of = (text: string | null) => (text ? sorted[fingerprint(text)] : undefined);
  return places.map((entry) => {
    const en = { description: of(entry.description), hours: of(entry.hours) };
    return en.description || en.hours ? { ...entry, en } : entry;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const country = process.env.COUNTRY ?? "co";
  if (country !== "sv") return;
  if (!key) {
    if (onVercel) throw new Error("CROMA_API_KEY is required to build /turismo");
    console.warn("turismo: no CROMA_API_KEY, skipping");
    return;
  }
  const started = Date.now();
  const [rawPlaces, rawEvents] = await Promise.all([allPlaces(), allEvents()]);
  const cache = await loadGeo();
  const located: Place[] = [];
  for (const raw of rawPlaces) located.push(place(raw, await locate(raw, cache)));
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(GEO, `${JSON.stringify(sorted, null, 1)}\n`);
  const catalog: Catalog = { syncedAt: new Date().toISOString(), places: await inEnglish(uniqueSlugs(located)), events: rawEvents.map(happening) };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(catalog));
  const precision = located.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.point?.precision ?? "none"]: (acc[entry.point?.precision ?? "none"] ?? 0) + 1 }), {});
  console.log(`turismo: ${catalog.places.length} places, ${catalog.events.length} events, ${lookups} new lookups, ${translations} new translations, map ${JSON.stringify(precision)}, ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
