import type { Kind, Place, Theme } from "./types";

export type Lang = "es" | "en";
export type Section = "home" | "explore" | "events" | "guides";
export type Filter = "q" | "kind" | "theme" | "department" | "language" | "registered" | "view";

export const LANGS: readonly Lang[] = ["es", "en"];
export const LOCALE: Record<Lang, string> = { es: "es-SV", en: "en-US" };

const ROOT: Record<Lang, string> = { es: "/turismo", en: "/tourism" };
const SEGMENT: Record<Lang, Record<Exclude<Section, "home"> | "place" | "department", string>> = {
  es: { explore: "explorar", events: "eventos", guides: "guias", place: "lugar", department: "departamento" },
  en: { explore: "explore", events: "events", guides: "guides", place: "place", department: "department" },
};

export const PARAM: Record<Lang, Record<Filter, string>> = {
  es: { q: "q", kind: "tipo", theme: "tema", department: "depto", language: "idioma", registered: "rnt", view: "vista" },
  en: { q: "q", kind: "type", theme: "theme", department: "department", language: "language", registered: "rnt", view: "view" },
};
export const MAP_VIEW: Record<Lang, string> = { es: "mapa", en: "map" };

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const langOf = (pathname: string): Lang => (pathname === ROOT.en || pathname.startsWith(`${ROOT.en}/`) ? "en" : "es");

export const sectionPath = (section: Section, lang: Lang = "es") => (section === "home" ? ROOT[lang] : `${ROOT[lang]}/${SEGMENT[lang][section]}`);
export const placePath = (place: Pick<Place, "slug">, lang: Lang = "es") => `${ROOT[lang]}/${SEGMENT[lang].place}/${place.slug}`;
export const departmentPath = (department: string, lang: Lang = "es") => `${ROOT[lang]}/${SEGMENT[lang].department}/${slugify(department)}`;
export const guidePath = (slug: string, lang: Lang = "es") => `${sectionPath("guides", lang)}#${slug}`;

/** The same page in the other language: the root and the first segment change, slugs stay. */
export function translatePath(pathname: string, to: Lang): string {
  const from = langOf(pathname);
  if (from === to) return pathname;
  const [segment, ...rest] = pathname.slice(ROOT[from].length).split("/").filter(Boolean);
  if (!segment) return ROOT[to];
  const key = (Object.keys(SEGMENT[from]) as (keyof (typeof SEGMENT)["es"])[]).find((name) => SEGMENT[from][name] === segment);
  return [ROOT[to], key ? SEGMENT[to][key] : segment, ...rest].join("/");
}

export function exploreHref(lang: Lang, filters: Partial<Record<Filter, string>> = {}): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters) as [Filter, string][]) if (value) params.set(PARAM[lang][name], name === "view" ? MAP_VIEW[lang] : value);
  const query = params.toString();
  return `${sectionPath("explore", lang)}${query ? `?${query}` : ""}`;
}

export const KIND_LABEL: Record<Lang, Record<Kind, { one: string; many: string }>> = {
  es: {
    destination: { one: "Destino", many: "Destinos" },
    attraction: { one: "Sitio turístico", many: "Sitios turísticos" },
    lodging: { one: "Hospedaje", many: "Hospedaje" },
    restaurant: { one: "Restaurante", many: "Restaurantes" },
    surf_school: { one: "Escuela de surf", many: "Escuelas de surf" },
    recreation: { one: "Recreación", many: "Recreación" },
    transport: { one: "Transporte", many: "Transporte" },
    tourist_info: { one: "Servicio turístico", many: "Servicios turísticos" },
    guide: { one: "Guía de turismo", many: "Guías de turismo" },
  },
  en: {
    destination: { one: "Destination", many: "Destinations" },
    attraction: { one: "Attraction", many: "Attractions" },
    lodging: { one: "Place to stay", many: "Places to stay" },
    restaurant: { one: "Restaurant", many: "Restaurants" },
    surf_school: { one: "Surf school", many: "Surf schools" },
    recreation: { one: "Recreation", many: "Recreation" },
    transport: { one: "Transport", many: "Transport" },
    tourist_info: { one: "Tourist service", many: "Tourist services" },
    guide: { one: "Tour guide", many: "Tour guides" },
  },
};

export const THEME_LABEL: Record<Lang, Record<Theme, string>> = {
  es: {
    surf_city: "Surf City",
    bitcoin: "Destinos Bitcoin",
    nature_adventure: "Naturaleza y aventura",
    archaeology: "Arqueología",
    towns: "Pueblos con encanto",
    wellness: "Bienestar",
    regional: "Más allá de El Salvador",
  },
  en: {
    surf_city: "Surf City",
    bitcoin: "Bitcoin destinations",
    nature_adventure: "Nature and adventure",
    archaeology: "Archaeology",
    towns: "Charming towns",
    wellness: "Wellness",
    regional: "Beyond El Salvador",
  },
};

export const LANGUAGE_LABEL: Record<Lang, Record<string, string>> = {
  es: { es: "Español", en: "Inglés", fr: "Francés", it: "Italiano", de: "Alemán", pt: "Portugués", nah: "Náhuat" },
  en: { es: "Spanish", en: "English", fr: "French", it: "Italian", de: "German", pt: "Portuguese", nah: "Nawat" },
};

export const GUIDE_LEVEL_LABEL = {
  es: { site: "Guía de sitio", local: "Guía local", national: "Guía nacional" },
  en: { site: "Site guide", local: "Local guide", national: "National guide" },
} as const;

export const DEPARTMENTS = ["Ahuachapán", "Santa Ana", "Sonsonate", "Chalatenango", "La Libertad", "San Salvador", "Cuscatlán", "La Paz", "Cabañas", "San Vicente", "Usulután", "San Miguel", "Morazán", "La Unión"] as const;

/** What a department is known for, in one line: the hook a department page and its card lead with. */
export const DEPARTMENT_LEAD: Record<Lang, Record<string, string>> = {
  es: {
    "Ahuachapán": "La Ruta de las Flores, cafetales de altura y aguas termales.",
    "Santa Ana": "Volcanes, el lago de Coatepeque y las ruinas mayas de Tazumal.",
    "Sonsonate": "Pueblos de artesanos, Los Cóbanos y la cuna de la Ruta de las Flores.",
    "Chalatenango": "Montaña, pinos y el punto más alto del país, El Pital.",
    "La Libertad": "Surf City: El Tunco, El Zonte y las mejores olas del país.",
    "San Salvador": "La capital: centro histórico, museos, comida y vida nocturna.",
    "Cuscatlán": "Suchitoto, calles empedradas y el lago Suchitlán.",
    "La Paz": "Costa del Sol, esteros y playas tranquilas cerca del aeropuerto.",
    "Cabañas": "Ilobasco, la artesanía en barro y bosques de Cinquera.",
    "San Vicente": "El volcán Chichontepec, balnearios y pueblos coloniales.",
    "Usulután": "La bahía de Jiquilisco, Punta Mango y el café de Berlín y Alegría.",
    "San Miguel": "Carnaval, playas de El Cuco y la ciudad de oriente.",
    "Morazán": "Perquín, la memoria histórica y la montaña del norte.",
    "La Unión": "El golfo de Fonseca, sus islas y playas como El Tamarindo.",
  },
  en: {
    "Ahuachapán": "The Ruta de las Flores, high-altitude coffee farms and hot springs.",
    "Santa Ana": "Volcanoes, Lake Coatepeque and the Maya ruins of Tazumal.",
    "Sonsonate": "Artisan towns, Los Cóbanos reef and the start of the Ruta de las Flores.",
    "Chalatenango": "Mountains, pine forests and El Pital, the country's highest peak.",
    "La Libertad": "Surf City: El Tunco, El Zonte and the best waves in the country.",
    "San Salvador": "The capital: historic center, museums, food and nightlife.",
    "Cuscatlán": "Suchitoto, cobblestone streets and Lake Suchitlán.",
    "La Paz": "Costa del Sol, mangrove estuaries and quiet beaches near the airport.",
    "Cabañas": "Ilobasco's clay crafts and the forests of Cinquera.",
    "San Vicente": "Chichontepec volcano, swimming spots and colonial towns.",
    "Usulután": "Jiquilisco Bay, Punta Mango and the coffee of Berlín and Alegría.",
    "San Miguel": "Carnival, the beaches of El Cuco and the great city of the east.",
    "Morazán": "Perquín, the country's historical memory and the northern mountains.",
    "La Unión": "The Gulf of Fonseca, its islands and beaches like El Tamarindo.",
  },
};
