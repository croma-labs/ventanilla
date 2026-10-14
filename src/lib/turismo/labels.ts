import type { Kind, Place, Theme } from "./types";

export type Lang = "es" | "en" | "pt" | "fr";
export type Section = "home" | "explore" | "events" | "guides";
export type Filter = "q" | "kind" | "theme" | "department" | "language" | "registered" | "view";

export const LANGS: readonly Lang[] = ["es", "en", "pt", "fr"];
export const LOCALE: Record<Lang, string> = { es: "es-SV", en: "en-US", pt: "pt-PT", fr: "fr-FR" };
export const HREFLANG: Record<Lang, string> = { es: "es-SV", en: "en", pt: "pt-PT", fr: "fr" };
/** Each language named in itself, for the language picker. */
export const ENDONYM: Record<Lang, string> = { es: "Español", en: "English", pt: "Português", fr: "Français" };

const ROOT: Record<Lang, string> = { es: "/turismo", en: "/tourism", pt: "/pt/turismo", fr: "/fr/tourisme" };
const SEGMENT: Record<Lang, Record<Exclude<Section, "home"> | "place" | "department", string>> = {
  es: { explore: "explorar", events: "eventos", guides: "guias", place: "lugar", department: "departamento" },
  en: { explore: "explore", events: "events", guides: "guides", place: "place", department: "department" },
  pt: { explore: "explorar", events: "eventos", guides: "guias", place: "local", department: "departamento" },
  fr: { explore: "explorer", events: "evenements", guides: "guides", place: "lieu", department: "departement" },
};

/** Every route of the guide in every language, as Astro patterns with the page each one renders. */
export const ROUTES = LANGS.flatMap((lang) => [
  { pattern: ROOT[lang], page: "index.astro" },
  { pattern: `${ROOT[lang]}/${SEGMENT[lang].explore}`, page: "explorar.astro" },
  { pattern: `${ROOT[lang]}/${SEGMENT[lang].events}`, page: "eventos.astro" },
  { pattern: `${ROOT[lang]}/${SEGMENT[lang].guides}`, page: "guias.astro" },
  { pattern: `${ROOT[lang]}/${SEGMENT[lang].place}/[slug]`, page: "lugar.astro" },
  { pattern: `${ROOT[lang]}/${SEGMENT[lang].department}/[slug]`, page: "departamento.astro" },
]);

/** A link to a place or an event in any language: the language, the kind of page and its slug or anchor. */
export function pageOf(url: string): { lang: Lang; kind: "place" | "event"; slug: string } | null {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  for (const lang of LANGS) {
    const place = path.match(new RegExp(`^${ROOT[lang]}/${SEGMENT[lang].place}/([a-z0-9-]+)`));
    if (place) return { lang, kind: "place", slug: place[1] };
    const event = path.match(new RegExp(`^${ROOT[lang]}/${SEGMENT[lang].events}#([a-z0-9-]+)`));
    if (event) return { lang, kind: "event", slug: event[1] };
  }
  return null;
}

export const PARAM: Record<Lang, Record<Filter, string>> = {
  es: { q: "q", kind: "tipo", theme: "tema", department: "depto", language: "idioma", registered: "rnt", view: "vista" },
  en: { q: "q", kind: "type", theme: "theme", department: "department", language: "language", registered: "rnt", view: "view" },
  pt: { q: "q", kind: "tipo", theme: "tema", department: "departamento", language: "idioma", registered: "rnt", view: "vista" },
  fr: { q: "q", kind: "type", theme: "theme", department: "departement", language: "langue", registered: "rnt", view: "vue" },
};
export const MAP_VIEW: Record<Lang, string> = { es: "mapa", en: "map", pt: "mapa", fr: "carte" };

/** French "de" before a name: elided before a vowel or a mute h (d'El Tunco, de Suchitoto). */
export const deFr = (name: string) => (/^[aeiouyhàâéèêëîïôûü]/i.test(name) ? `d'${name}` : `de ${name}`);

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const langOf = (pathname: string): Lang => LANGS.find((lang) => lang !== "es" && (pathname === ROOT[lang] || pathname.startsWith(`${ROOT[lang]}/`))) ?? "es";

/** Whether a path is one of the guide's pages, in any language. */
export const isGuidePath = (pathname: string) => LANGS.some((lang) => pathname === ROOT[lang] || pathname.startsWith(`${ROOT[lang]}/`));

export const sectionPath = (section: Section, lang: Lang = "es") => (section === "home" ? ROOT[lang] : `${ROOT[lang]}/${SEGMENT[lang][section]}`);
export const placePath = (place: Pick<Place, "slug">, lang: Lang = "es") => `${ROOT[lang]}/${SEGMENT[lang].place}/${place.slug}`;
export const departmentPath = (department: string, lang: Lang = "es") => `${ROOT[lang]}/${SEGMENT[lang].department}/${slugify(department)}`;
export const guidePath = (slug: string, lang: Lang = "es") => `${sectionPath("guides", lang)}#${slug}`;

/** The same page in another language: the root and the first segment change, slugs stay. */
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
  pt: {
    destination: { one: "Destino", many: "Destinos" },
    attraction: { one: "Atração turística", many: "Atrações turísticas" },
    lodging: { one: "Alojamento", many: "Alojamento" },
    restaurant: { one: "Restaurante", many: "Restaurantes" },
    surf_school: { one: "Escola de surf", many: "Escolas de surf" },
    recreation: { one: "Lazer", many: "Lazer" },
    transport: { one: "Transporte", many: "Transportes" },
    tourist_info: { one: "Serviço turístico", many: "Serviços turísticos" },
    guide: { one: "Guia turístico", many: "Guias turísticos" },
  },
  fr: {
    destination: { one: "Destination", many: "Destinations" },
    attraction: { one: "Site touristique", many: "Sites touristiques" },
    lodging: { one: "Hébergement", many: "Hébergements" },
    restaurant: { one: "Restaurant", many: "Restaurants" },
    surf_school: { one: "École de surf", many: "Écoles de surf" },
    recreation: { one: "Loisirs", many: "Loisirs" },
    transport: { one: "Transport", many: "Transports" },
    tourist_info: { one: "Service touristique", many: "Services touristiques" },
    guide: { one: "Guide touristique", many: "Guides touristiques" },
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
  pt: {
    surf_city: "Surf City",
    bitcoin: "Destinos Bitcoin",
    nature_adventure: "Natureza e aventura",
    archaeology: "Arqueologia",
    towns: "Vilas com encanto",
    wellness: "Bem-estar",
    regional: "Além de El Salvador",
  },
  fr: {
    surf_city: "Surf City",
    bitcoin: "Destinations Bitcoin",
    nature_adventure: "Nature et aventure",
    archaeology: "Archéologie",
    towns: "Villages de charme",
    wellness: "Bien-être",
    regional: "Au-delà du Salvador",
  },
};

export const LANGUAGE_LABEL: Record<Lang, Record<string, string>> = {
  es: { es: "Español", en: "Inglés", fr: "Francés", it: "Italiano", de: "Alemán", pt: "Portugués", nah: "Náhuat" },
  en: { es: "Spanish", en: "English", fr: "French", it: "Italian", de: "German", pt: "Portuguese", nah: "Nawat" },
  pt: { es: "Espanhol", en: "Inglês", fr: "Francês", it: "Italiano", de: "Alemão", pt: "Português", nah: "Náuatle pipil" },
  fr: { es: "Espagnol", en: "Anglais", fr: "Français", it: "Italien", de: "Allemand", pt: "Portugais", nah: "Nahuat" },
};

export const GUIDE_LEVEL_LABEL = {
  es: { site: "Guía de sitio", local: "Guía local", national: "Guía nacional" },
  en: { site: "Site guide", local: "Local guide", national: "National guide" },
  pt: { site: "Guia de local", local: "Guia local", national: "Guia nacional" },
  fr: { site: "Guide de site", local: "Guide local", national: "Guide national" },
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
  pt: {
    "Ahuachapán": "A Ruta de las Flores, cafezais de altitude e águas termais.",
    "Santa Ana": "Vulcões, o lago de Coatepeque e as ruínas maias de Tazumal.",
    "Sonsonate": "Vilas de artesãos, o recife de Los Cóbanos e o início da Ruta de las Flores.",
    "Chalatenango": "Montanha, pinhais e El Pital, o ponto mais alto do país.",
    "La Libertad": "Surf City: El Tunco, El Zonte e as melhores ondas do país.",
    "San Salvador": "A capital: centro histórico, museus, gastronomia e vida noturna.",
    "Cuscatlán": "Suchitoto, ruas de calçada e o lago Suchitlán.",
    "La Paz": "Costa del Sol, mangais e praias tranquilas perto do aeroporto.",
    "Cabañas": "O artesanato em barro de Ilobasco e as florestas de Cinquera.",
    "San Vicente": "O vulcão Chichontepec, zonas balneares e vilas coloniais.",
    "Usulután": "A baía de Jiquilisco, Punta Mango e o café de Berlín e Alegría.",
    "San Miguel": "O carnaval, as praias de El Cuco e a grande cidade do oriente.",
    "Morazán": "Perquín, a memória histórica do país e as montanhas do norte.",
    "La Unión": "O golfo de Fonseca, as suas ilhas e praias como El Tamarindo.",
  },
  fr: {
    "Ahuachapán": "La Ruta de las Flores, des caféiers d'altitude et des sources chaudes.",
    "Santa Ana": "Des volcans, le lac de Coatepeque et les ruines mayas de Tazumal.",
    "Sonsonate": "Des villages d'artisans, le récif de Los Cóbanos et le début de la Ruta de las Flores.",
    "Chalatenango": "La montagne, des forêts de pins et El Pital, le point culminant du pays.",
    "La Libertad": "Surf City : El Tunco, El Zonte et les meilleures vagues du pays.",
    "San Salvador": "La capitale : centre historique, musées, gastronomie et vie nocturne.",
    "Cuscatlán": "Suchitoto, ses rues pavées et le lac Suchitlán.",
    "La Paz": "La Costa del Sol, des mangroves et des plages tranquilles près de l'aéroport.",
    "Cabañas": "La poterie d'Ilobasco et les forêts de Cinquera.",
    "San Vicente": "Le volcan Chichontepec, des lieux de baignade et des villages coloniaux.",
    "Usulután": "La baie de Jiquilisco, Punta Mango et le café de Berlín et d'Alegría.",
    "San Miguel": "Le carnaval, les plages d'El Cuco et la grande ville de l'est.",
    "Morazán": "Perquín, la mémoire historique du pays et les montagnes du nord.",
    "La Unión": "Le golfe de Fonseca, ses îles et des plages comme El Tamarindo.",
  },
};
