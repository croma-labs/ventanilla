import { existsSync, readFileSync } from "node:fs";
import type { Lang } from "./labels";
import type { Catalog, Happening, Kind, Place } from "./types";

const FILE = ".turismo/catalog.json";

export const catalog: Catalog = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { syncedAt: new Date(0).toISOString(), places: [], events: [] };

export const places = catalog.places;
export const events = catalog.events;

export * from "./dates";
export * from "./labels";

export const byDepartment = (department: string) => places.filter((place) => place.department === department);

export const photoOf = (place: Place) => place.photos[0]?.src ?? null;

/** A place's own words in the reader's language, and which language they are actually in. */
export function textOf(place: Place, lang: Lang) {
  const own = lang === "es" ? undefined : place.i18n?.[lang];
  const description = own?.description ?? null;
  const hours = own?.hours ?? null;
  return {
    description: description ?? place.description,
    descriptionLang: description || !place.description ? lang : ("es" as Lang),
    hours: hours ?? place.hours,
    hoursLang: hours || !place.hours ? lang : ("es" as Lang),
  };
}

/** A photo for a place that has none of its own: the nearest destination in its town, then its department. */
export function standIn(place: Place): string | null {
  if (place.photos.length) return place.photos[0].src;
  const withPhoto = places.filter((other) => other.photos.length);
  const town = withPhoto.find((other) => other.municipality && other.municipality === place.municipality);
  if (town) return town.photos[0].src;
  return withPhoto.find((other) => other.department && other.department === place.department)?.photos[0].src ?? null;
}

const rad = Math.PI / 180;
export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** Places near another: by distance when both are on the map, by town otherwise. Guides are people, not places to visit. */
export function nearby(place: Place, limit = 8): Place[] {
  const candidates = places.filter((other) => other.id !== place.id && other.kind !== "guide");
  if (place.point) {
    const origin = place.point;
    return candidates
      .filter((other) => other.point)
      .map((other) => ({ other, km: distanceKm(origin, other.point!) }))
      .filter(({ km }) => km < 25)
      .sort((a, b) => Number(!!b.other.photos.length) - Number(!!a.other.photos.length) || a.km - b.km)
      .slice(0, limit)
      .map(({ other }) => other);
  }
  return candidates.filter((other) => other.municipality === place.municipality || other.department === place.department).slice(0, limit);
}

export const upcoming = (from = new Date()): Happening[] => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador" }).format(from);
  return events
    .filter((event) => (event.end ?? event.start ?? "") >= today)
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
};

export const telHref = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 8 ? `+503${digits}` : `+${digits}`}`;
};

export const phoneLabel = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : phone;
};

export const directionsHref = (place: Place) =>
  place.point && place.point.precision === "exact"
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.point.lat},${place.point.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.name, place.address ?? place.municipality, place.department, "El Salvador"].filter(Boolean).join(", "))}`;

export const wazeHref = (place: Place) =>
  place.point?.precision === "exact" ? `https://waze.com/ul?ll=${place.point.lat},${place.point.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent([place.name, place.municipality, "El Salvador"].filter(Boolean).join(" "))}&navigate=yes`;

export const counts = () => {
  const byKind = new Map<Kind, number>();
  for (const place of places) byKind.set(place.kind, (byKind.get(place.kind) ?? 0) + 1);
  return byKind;
};
