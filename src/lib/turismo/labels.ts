import type { Kind, Place, Theme } from "./types";

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const placePath = (place: Pick<Place, "slug">) => `/turismo/lugar/${place.slug}`;
export const departmentPath = (department: string) => `/turismo/departamento/${slugify(department)}`;

export const KIND_LABEL: Record<Kind, { one: string; many: string; icon: string }> = {
  destination: { one: "Destino", many: "Destinos", icon: "compass" },
  attraction: { one: "Sitio turístico", many: "Sitios turísticos", icon: "landmark" },
  lodging: { one: "Hospedaje", many: "Hospedaje", icon: "bed" },
  restaurant: { one: "Restaurante", many: "Restaurantes", icon: "fork" },
  surf_school: { one: "Escuela de surf", many: "Escuelas de surf", icon: "wave" },
  recreation: { one: "Recreación", many: "Recreación", icon: "sparkle" },
  transport: { one: "Transporte", many: "Transporte", icon: "car" },
  tourist_info: { one: "Servicio turístico", many: "Servicios turísticos", icon: "info" },
  guide: { one: "Guía de turismo", many: "Guías de turismo", icon: "person" },
};

export const THEME_LABEL: Record<Theme, string> = {
  surf_city: "Surf City",
  bitcoin: "Destinos Bitcoin",
  nature_adventure: "Naturaleza y aventura",
  archaeology: "Arqueología",
  towns: "Pueblos con encanto",
  wellness: "Bienestar",
  regional: "Más allá de El Salvador",
};

export const LANGUAGE_LABEL: Record<string, string> = { es: "Español", en: "Inglés", fr: "Francés", it: "Italiano", de: "Alemán", pt: "Portugués", nah: "Náhuat" };

export const GUIDE_LEVEL_LABEL = { site: "Guía de sitio", local: "Guía local", national: "Guía nacional" } as const;

export const DEPARTMENTS = ["Ahuachapán", "Santa Ana", "Sonsonate", "Chalatenango", "La Libertad", "San Salvador", "Cuscatlán", "La Paz", "Cabañas", "San Vicente", "Usulután", "San Miguel", "Morazán", "La Unión"] as const;

/** What a department is known for, in one line: the hook a department page and its card lead with. */
export const DEPARTMENT_LEAD: Record<string, string> = {
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
};

