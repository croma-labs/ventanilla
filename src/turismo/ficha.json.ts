import type { APIRoute } from "astro";
import { directionsHref, LANGS, phoneLabel, placePath, places, standIn, telHref, textOf, wazeHref } from "../lib/turismo/catalog";
import { picture } from "../lib/turismo/images";
import type { Lang } from "../lib/turismo/labels";
import type { Ficha, Place } from "../lib/turismo/types";

export const getStaticPaths = () => places.filter((place) => place.kind !== "guide").map((place) => ({ params: { slug: place.slug }, props: { place } }));

const lead = (text: string | null, limit = 260) => {
  const lines: string[] = [];
  for (const line of (text ?? "").split("\n").map((part) => part.trim()).filter(Boolean)) {
    if (lines.join(" ").length >= 140) break;
    lines.push(line);
  }
  const joined = lines.join(" ");
  if (joined.length <= limit) return joined || null;
  return `${joined.slice(0, joined.lastIndexOf(" ", limit - 1)).replace(/[\s,;:.]+$/, "")}…`;
};

/** One place as the chat draws it: a card in the answer and a sheet when tapped. */
export const GET: APIRoute = async ({ props }) => {
  const { place } = props as { place: Place };
  const ownPhotos = place.photos.length > 0;
  const sources = ownPhotos ? place.photos.slice(0, 8).map((photo) => photo.src) : [standIn(place)].filter((src): src is string => !!src);
  const photos = (await Promise.all(sources.map((src) => picture(src, [480, 960])))).filter((photo) => photo !== null);
  const texts = LANGS.map((lang) => [lang, textOf(place, lang)] as const);
  const own = <T>(pick: (text: ReturnType<typeof textOf>, lang: Lang) => T) => Object.fromEntries(texts.map(([lang, text]) => [lang, pick(text, lang)])) as Record<Lang, T>;
  const ficha: Ficha = {
    slug: place.slug,
    name: place.name,
    kind: place.kind,
    registered: place.registered,
    municipality: place.municipality,
    department: place.department,
    summary: own((text, lang) => lead(text.descriptionLang === lang ? text.description : null)),
    description: own((text, lang) => (text.descriptionLang === lang ? text.description : null)),
    hours: own((text, lang) => (text.hoursLang === lang ? text.hours : null)),
    phones: place.phones.map((phone) => ({ href: telHref(phone), label: phoneLabel(phone) })),
    whatsapp: place.whatsapp,
    emails: place.emails,
    website: place.website,
    address: place.address,
    socials: place.socials,
    photos,
    ownPhotos,
    point: place.point,
    directions: directionsHref(place),
    waze: wazeHref(place),
    pages: own((_, lang) => placePath(place, lang)),
  };
  return new Response(JSON.stringify(ficha), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
