import type { APIRoute } from "astro";
import { directionsHref, phoneLabel, placePath, places, standIn, telHref, textOf, wazeHref } from "../lib/turismo/catalog";
import { picture } from "../lib/turismo/images";
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
  const own = place.photos.length > 0;
  const sources = own ? place.photos.slice(0, 8).map((photo) => photo.src) : [standIn(place)].filter((src): src is string => !!src);
  const photos = (await Promise.all(sources.map((src) => picture(src, [480, 960])))).filter((photo) => photo !== null);
  const es = textOf(place, "es");
  const en = textOf(place, "en");
  const ficha: Ficha = {
    slug: place.slug,
    name: place.name,
    kind: place.kind,
    registered: place.registered,
    municipality: place.municipality,
    department: place.department,
    summary: { es: lead(es.description), en: lead(en.descriptionLang === "en" ? en.description : null) },
    description: { es: es.description, en: en.descriptionLang === "en" ? en.description : null },
    hours: { es: es.hours, en: en.hoursLang === "en" ? en.hours : null },
    phones: place.phones.map((phone) => ({ href: telHref(phone), label: phoneLabel(phone) })),
    whatsapp: place.whatsapp,
    emails: place.emails,
    website: place.website,
    address: place.address,
    socials: place.socials,
    photos,
    ownPhotos: own,
    point: place.point,
    directions: directionsHref(place),
    waze: wazeHref(place),
    pages: { es: placePath(place, "es"), en: placePath(place, "en") },
  };
  return new Response(JSON.stringify(ficha), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
