import type { APIRoute } from "astro";
import { site as country } from "@country/site";
import { catalog, DEPARTMENT_LEAD, DEPARTMENTS, departmentPath, KIND_LABEL, placePath, places, sectionPath, textOf, upcoming, type Lang } from "../lib/turismo/catalog";
import type { Kind } from "../lib/turismo/types";
import { pathOf, published, summaryOf } from "../lib/tramites";

/** A map of the site for language models: what it is, what each section answers, and where the pages are. */
export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://gov.usecroma.com");
  const at = (path: string) => new URL(path, origin).href;
  const lines = [
    `# ${country.brand.name} (${country.country})`,
    "",
    `> ${country.meta.description} ${country.brand.notice}`,
    "",
    "## Trámites",
    "",
    ...published.map((tramite) => `- [${tramite.title}](${at(pathOf(tramite.slug))}): ${summaryOf(tramite.answer, 200) || tramite.question}`),
  ];
  if (country.code === "sv" && places.length) {
    const counted = [...places.reduce((acc, place) => acc.set(place.kind, (acc.get(place.kind) ?? 0) + 1), new Map<Kind, number>()).entries()].sort((a, b) => b[1] - a[1]);
    const kinds = (lang: Lang) => counted.map(([kind, count]) => `${count} ${KIND_LABEL[lang][kind].many.toLowerCase()}`).join(", ");
    const destinations = places.filter((place) => place.kind === "destination" && place.description);
    const synced = catalog.syncedAt.slice(0, 10);
    lines.push(
      "",
      "## Turismo en El Salvador",
      "",
      `> El directorio oficial de turismo del Ministerio de Turismo de El Salvador: ${kinds("es")}. Cada lugar tiene su departamento, municipio y, para los negocios, teléfonos, WhatsApp, correo, sitio web y redes sociales. Actualizado el ${synced}.`,
      "",
      `- [Turismo en El Salvador](${at(sectionPath("home", "es"))}): portada con destinos por temática, eventos próximos y los 14 departamentos.`,
      `- [Explorar y mapa](${at(sectionPath("explore", "es"))}): búsqueda y filtros por tipo, departamento, temática, idioma del guía e inscripción en el Registro Nacional de Turismo. Acepta ?q=, ?tipo=, ?depto=, ?tema=, ?idioma= y ?rnt=1.`,
      `- [Agenda de eventos](${at(sectionPath("events", "es"))}): ${upcoming().length} eventos próximos con fechas y lugar.`,
      `- [Guías certificados](${at(sectionPath("guides", "es"))}): guías de turismo con sus idiomas y zona.`,
      "",
      "### Departamentos",
      "",
      ...DEPARTMENTS.map((name) => `- [${name}](${at(departmentPath(name, "es"))}): ${DEPARTMENT_LEAD.es[name]}`),
      "",
      "### Destinos",
      "",
      ...destinations.map((place) => `- [${place.name}](${at(placePath(place, "es"))}): ${(place.description ?? "").split("\n")[0].slice(0, 220)}`),
      "",
      "## El Salvador travel guide (English)",
      "",
      `> Every tourism page also exists in English under /tourism, built from the same official directory of El Salvador's Ministry of Tourism: ${kinds("en")}. Each place lists its department, town and, for businesses, phones, WhatsApp, email, website and social media. Updated ${synced}.`,
      "",
      `- [El Salvador travel guide](${at(sectionPath("home", "en"))}): destinations by theme, upcoming events and the 14 departments.`,
      `- [Explore and map](${at(sectionPath("explore", "en"))}): search and filter by type, department, theme, guide language and National Tourism Registry listing. Accepts ?q=, ?type=, ?department=, ?theme=, ?language= and ?rnt=1.`,
      `- [Events calendar](${at(sectionPath("events", "en"))}): ${upcoming().length} upcoming events with dates and venues.`,
      `- [Certified tour guides](${at(sectionPath("guides", "en"))}): tour guides with their languages and area.`,
      "",
      "### Departments",
      "",
      ...DEPARTMENTS.map((name) => `- [${name}](${at(departmentPath(name, "en"))}): ${DEPARTMENT_LEAD.en[name]}`),
      "",
      "### Destinations",
      "",
      ...destinations.map((place) => `- [${place.name}](${at(placePath(place, "en"))}): ${(textOf(place, "en").description ?? "").split("\n")[0].slice(0, 220)}`),
      "",
      "## Guia de viagem de El Salvador (português de Portugal)",
      "",
      `> Todas as páginas de turismo existem também em português de Portugal em /pt/turismo, a partir do mesmo diretório oficial do Ministério do Turismo de El Salvador: ${kinds("pt")}. Atualizado a ${synced}.`,
      "",
      `- [Guia de viagem de El Salvador](${at(sectionPath("home", "pt"))}): destinos por tema, próximos eventos e os 14 departamentos.`,
      `- [Explorar e mapa](${at(sectionPath("explore", "pt"))}): pesquisa e filtros por tipo, departamento, tema, idioma do guia e inscrição no Registo Nacional de Turismo. Aceita ?q=, ?tipo=, ?departamento=, ?tema=, ?idioma= e ?rnt=1.`,
      `- [Agenda de eventos](${at(sectionPath("events", "pt"))}): ${upcoming().length} eventos com datas e locais.`,
      `- [Guias turísticos certificados](${at(sectionPath("guides", "pt"))}): guias com os seus idiomas e zona.`,
      "",
      ...DEPARTMENTS.map((name) => `- [${name}](${at(departmentPath(name, "pt"))}): ${DEPARTMENT_LEAD.pt[name]}`),
      "",
      ...destinations.map((place) => `- [${place.name}](${at(placePath(place, "pt"))}): ${(textOf(place, "pt").description ?? "").split("\n")[0].slice(0, 220)}`),
      "",
      "## Guide de voyage du Salvador (français)",
      "",
      `> Toutes les pages touristiques existent aussi en français sous /fr/tourisme, à partir du même annuaire officiel du ministère du Tourisme du Salvador : ${kinds("fr")}. Mis à jour le ${synced}.`,
      "",
      `- [Guide de voyage du Salvador](${at(sectionPath("home", "fr"))}) : destinations par thème, événements à venir et les 14 départements.`,
      `- [Explorer et carte](${at(sectionPath("explore", "fr"))}) : recherche et filtres par type, département, thème, langue du guide et inscription au Registre national du tourisme. Accepte ?q=, ?type=, ?departement=, ?theme=, ?langue= et ?rnt=1.`,
      `- [Agenda des événements](${at(sectionPath("events", "fr"))}) : ${upcoming().length} événements avec dates et lieux.`,
      `- [Guides touristiques certifiés](${at(sectionPath("guides", "fr"))}) : guides avec leurs langues et leur zone.`,
      "",
      ...DEPARTMENTS.map((name) => `- [${name}](${at(departmentPath(name, "fr"))}) : ${DEPARTMENT_LEAD.fr[name]}`),
      "",
      ...destinations.map((place) => `- [${place.name}](${at(placePath(place, "fr"))}) : ${(textOf(place, "fr").description ?? "").split("\n")[0].slice(0, 220)}`),
    );
  }
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
