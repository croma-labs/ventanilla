import type { Lang } from "./labels";

export const KINDS = ["destination", "attraction", "lodging", "restaurant", "surf_school", "recreation", "transport", "tourist_info", "guide"] as const;
export type Kind = (typeof KINDS)[number];

export const THEMES = ["surf_city", "bitcoin", "nature_adventure", "archaeology", "towns", "wellness", "regional"] as const;
export type Theme = (typeof THEMES)[number];

export type Precision = "exact" | "town" | "department";

export type Point = { lat: number; lng: number; precision: Precision };

export type Photo = { src: string; source: string };

export type Social = { network: "instagram" | "facebook" | "tiktok" | "x" | "youtube" | "linkedin" | "web"; url: string; handle: string };

export type Place = {
  id: string;
  slug: string;
  name: string;
  kind: Kind;
  themes: Theme[];
  guideLevel: "site" | "local" | "national" | null;
  registered: boolean;
  access: "public" | "private" | null;
  department: string | null;
  municipality: string | null;
  region: string | null;
  languages: string[];
  description: string | null;
  hours: string | null;
  phones: string[];
  emails: string[];
  address: string | null;
  website: string | null;
  whatsapp: string | null;
  socials: Social[];
  photos: Photo[];
  point: Point | null;
  updatedAt: string;
  en?: { description?: string; hours?: string };
};

export type Happening = {
  id: string;
  slug: string;
  name: string;
  start: string | null;
  end: string | null;
  venue: string | null;
  department: string | null;
  links: { url: string; label: string }[];
};

export type Catalog = { syncedAt: string; places: Place[]; events: Happening[] };

/** What the browse page ships to the browser: one row per place, nothing it does not draw. */
export type IndexRow = {
  s: string;
  n: string;
  k: Kind;
  t: Theme[];
  d: string | null;
  m: string | null;
  r: 0 | 1;
  l?: string[];
  p?: [number, number, 0 | 1 | 2];
  i?: string;
};

/** What the chat draws for a place, its card and its sheet, in both languages. */
export type Ficha = {
  slug: string;
  name: string;
  kind: Kind;
  registered: boolean;
  municipality: string | null;
  department: string | null;
  summary: Record<Lang, string | null>;
  description: Record<Lang, string | null>;
  hours: Record<Lang, string | null>;
  phones: { href: string; label: string }[];
  whatsapp: string | null;
  emails: string[];
  website: string | null;
  address: string | null;
  socials: Social[];
  photos: { src: string; srcset: string }[];
  ownPhotos: boolean;
  point: Point | null;
  directions: string;
  waze: string;
  pages: Record<Lang, string>;
};

/** What the chat draws for an event. */
export type AgendaItem = Pick<Happening, "id" | "slug" | "name" | "start" | "end" | "venue" | "department" | "links">;
