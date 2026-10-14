import type { APIRoute } from "astro";
import { places } from "../lib/turismo/catalog";
import { picture } from "../lib/turismo/images";
import type { IndexRow } from "../lib/turismo/types";

const PRECISION = { exact: 0, town: 1, department: 2 } as const;

/** The browse page's whole directory, one compact row per place, fetched once and searched in the browser. */
export const GET: APIRoute = async () => {
  const thumbs = new Map<string, string>();
  for (const src of new Set(places.map((place) => place.photos[0]?.src).filter((src): src is string => !!src))) {
    const image = await picture(src, [400]);
    if (image) thumbs.set(src, image.src);
  }
  const rows: IndexRow[] = places.map((place) => {
    const thumb = place.photos[0]?.src;
    return {
      s: place.slug,
      n: place.name,
      k: place.kind,
      t: place.themes,
      d: place.department,
      m: place.municipality,
      r: place.registered ? 1 : 0,
      ...(place.languages.length && place.kind === "guide" ? { l: place.languages } : {}),
      ...(place.point ? { p: [place.point.lat, place.point.lng, PRECISION[place.point.precision]] as [number, number, 0 | 1 | 2] } : {}),
      ...(thumb && thumbs.has(thumb) ? { i: thumbs.get(thumb) } : {}),
    };
  });
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
