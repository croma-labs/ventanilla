import type { APIRoute } from "astro";
import { site as country } from "@country/site";
import { catalog, DEPARTMENT_LEAD, DEPARTMENTS, departmentPath, KIND_LABEL, placePath, places, upcoming } from "../lib/turismo/catalog";
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
    const kinds = [...places.reduce((acc, place) => acc.set(place.kind, (acc.get(place.kind) ?? 0) + 1), new Map<keyof typeof KIND_LABEL, number>()).entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, count]) => `${count} ${KIND_LABEL[kind].many.toLowerCase()}`)
      .join(", ");
    const destinations = places.filter((place) => place.kind === "destination" && place.description);
    lines.push(
      "",
      "## Turismo en El Salvador",
      "",
      `> El directorio oficial de turismo del Ministerio de Turismo de El Salvador: ${kinds}. Cada lugar tiene su departamento, municipio y, para los negocios, teléfonos, WhatsApp, correo, sitio web y redes sociales. Actualizado el ${catalog.syncedAt.slice(0, 10)}.`,
      "",
      `- [Turismo en El Salvador](${at("/turismo")}): portada con destinos por temática, eventos próximos y los 14 departamentos.`,
      `- [Explorar y mapa](${at("/turismo/explorar")}): búsqueda y filtros por tipo, departamento, temática, idioma del guía e inscripción en el Registro Nacional de Turismo. Acepta ?q=, ?tipo=, ?depto=, ?tema=, ?idioma= y ?rnt=1.`,
      `- [Agenda de eventos](${at("/turismo/eventos")}): ${upcoming().length} eventos próximos con fechas y lugar.`,
      `- [Guías certificados](${at("/turismo/guias")}): guías de turismo con sus idiomas y zona.`,
      "",
      "### Departamentos",
      "",
      ...DEPARTMENTS.map((name) => `- [${name}](${at(departmentPath(name))}): ${DEPARTMENT_LEAD[name]}`),
      "",
      "### Destinos",
      "",
      ...destinations.map((place) => `- [${place.name}](${at(placePath(place))}): ${(place.description ?? "").split("\n")[0].slice(0, 220)}`),
    );
  }
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
