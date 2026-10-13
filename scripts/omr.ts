import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { put } from "@vercel/blob";
import type { CorpusLine } from "../src/server/corpus-index.ts";

// Builds El Salvador's procedures corpus from the Registro Nacional de Trámites
// that the Organismo de Mejora Regulatoria publishes, one record per modality,
// in the same shape as Colombia's SUIT corpus, and uploads it where
// scripts/corpus.ts pulls it from. Raw responses are kept in .omr/ (gitignored)
// so an interrupted crawl resumes where it stopped.
//   npm run omr                build .omr/fichas.jsonl.gz
//   npm run omr -- --upload    and publish it as the latest corpus
//   npm run omr -- --fresh     refetch every modality

const api = "https://rnt.simejora.omr.gob.sv/api";
const portal = "https://simejora.omr.gob.sv";
const dir = ".omr";
const concurrency = 4;
const maxOffices = 8;

type Listed = { tramite_id: number; modalidad_id: number; nombre_tramite: string; nombre_modalidad: string; nombre_institucion: string; nombre_unidad: string; estado_nombre: string };
type Named = { nombre: string };
type Phone = { prefijo?: string | null; numero?: string | null; telefono?: string | null; extension?: string | null };
type Hours = { dia: string; hora_inicio: string | null; hora_fin: string | null; horas_24: boolean | null };
type Office = { nombre: string; direccion: string | null; tipo_oficina: string | null; enlace: string | null; horarios: Hours[] };
type Contact = { telefonos: { tipo_telefono?: Phone }[] | null; oficina: Office | null };
type Verdict = { comentarios: string | null; estados_dictamen: Named[] };
type Requirement = {
  nombre: string;
  descripcion: string | null;
  enlace_web: string | null;
  orden: number;
  condiciones_presentacion: string | null;
  tipo_requisito: Named;
  tipo_soporte: Named | null;
  dictamenes: Verdict[];
  sub_requisitos: { nombre: string; descripcion: string | null }[];
};
type Detail = {
  id: number;
  nombre: string;
  descripcion: string | null;
  tercero_autorizado: boolean | null;
  comentario_tercero_autorizado: string | null;
  vigencia_tramite: string | null;
  cantidad: number | string | null;
  unidad_tiempo: Named | null;
  descripcion_vigencia_variable: string | null;
  tipo_tarifa: string | null;
  monto: string | number | null;
  detalle_tarifa_variable: string | null;
  enlace_pliego_tarifario: string | null;
  comentario_costo_tramite: string | null;
  plazo_legal_valor: number | string | null;
  plazo_legal_unidad_tiempo: Named | null;
  plazo_legal_tipo_dias: string | null;
  comentario_plazo_legal: string | null;
  tiempo_promedio_valor: number | string | null;
  tiempo_promedio_unidad_tiempo: Named | null;
  tiempo_promedio_tipo_dias: string | null;
  numero_expediente: string | null;
  clasificacion_tramite: Named | null;
  categorias_tramites: Named[];
  poblaciones: Named[];
  medios_presentacion: Named[];
  niveles_digitalizacion: Named[];
  modalidades_pagos: Named[];
  periodicidad: Named | null;
  contactos_oficinas: Contact[];
  requisitos: Requirement[];
  tramite: { nombre: string; unidad: { nombre: string; institucion: { nombre: string; siglas: string | null; descripcion: string | null } } };
  documento_resolucion: { created_at: string } | null;
};

const args = new Set(process.argv.slice(2));

async function json<T>(path: string, attempt = 1): Promise<T> {
  const response = await fetch(`${api}${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) }).catch((error) => error as Error);
  if (response instanceof Response && response.ok) return (await response.json()) as T;
  if (attempt >= 4) throw new Error(`omr: ${path} failed: ${response instanceof Response ? response.status : response.message}`);
  await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
  return json(path, attempt + 1);
}

async function detail(id: number): Promise<Detail> {
  const file = `${dir}/raw/${id}.json`;
  const cached = await readFile(file, "utf8").catch(() => null);
  if (cached) return JSON.parse(cached);
  const fetched = await json<Detail>(`/public_modalidad_get_id/${id}`);
  await writeFile(file, JSON.stringify(fetched));
  return fetched;
}

async function crawl(listed: Listed[]) {
  const details = new Map<number, Detail>();
  let next = 0;
  const worker = async () => {
    while (next < listed.length) {
      const { modalidad_id } = listed[next++];
      details.set(modalidad_id, await detail(modalidad_id));
      if (details.size % 250 === 0) console.info(`omr: ${details.size}/${listed.length} modalities`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return details;
}

const clean = (text: string | number | null | undefined) =>
  String(text ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const filled = (text: string | number | null | undefined) => {
  const value = clean(text);
  return value && !/^(no aplica|n\/a|ninguno|-)\.?$/i.test(value) ? value : "";
};

// A break before a lowercase word is the source's own line wrapping, not a new item.
const inline = (text: string | null | undefined) =>
  filled(text)
    .replace(/\s*\n\s*(?=\p{Ll})/gu, " ")
    .replace(/\s*\n+\s*/g, "; ")
    .replace(/([.;:,])(?:\s*;)+/g, "$1");

const names = (items: Named[] | null | undefined) => (items ?? []).map((item) => clean(item.nombre)).filter(Boolean).join(", ");

// Sites for institutions whose registry entry names none; the registry's own wins when it has one.
const knownSites: [RegExp, string][] = [
  [/Migración y Extranjería/, "https://www.migracion.gob.sv/"],
  [/^Ministerio de Hacienda/, "https://www.mh.gob.sv/"],
  [/^Superintendencia del Sistema Financiero/, "https://ssf.gob.sv/"],
  [/^Procuraduría General de la República/, "https://www.pgr.gob.sv/"],
  [/^Registro Nacional de las Personas Naturales/, "https://www.rnpn.gob.sv/"],
  [/^Instituto Salvadoreño del Seguro Social/, "https://www.isss.gob.sv/"],
  [/^Ministerio de Vivienda/, "https://www.vivienda.gob.sv/"],
];

function website(institution: string, text: string | null) {
  const match = text?.match(/https?:\/\/[^\s"<>]+/)?.[0];
  try {
    const url = match ? new URL(match) : null;
    if (url && url.hostname.endsWith(".sv")) return `${url.origin}/`;
  } catch {}
  return knownSites.find(([pattern]) => pattern.test(institution))?.[1] ?? null;
}

const singulars: Record<string, string> = { minutos: "minuto", horas: "hora", días: "día", semanas: "semana", meses: "mes", años: "año", hábiles: "hábil", calendarios: "calendario" };
const singular = (word: string) => singulars[word] ?? word;

const span = (value: number | string | null, unit: Named | null, days: string | null) => {
  if (!Number(value)) return "";
  const words = [clean(unit?.nombre).toLowerCase(), clean(days).toLowerCase()].filter(Boolean);
  return [Number(value), ...(Number(value) === 1 ? words.map(singular) : words)].join(" ");
};

const verdictOf = (requirement: Requirement) => requirement.dictamenes.at(-1)?.estados_dictamen.at(-1)?.nombre.toLowerCase() ?? "";

const week = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const dayOf = (text: string) => week.find((day) => day.normalize("NFD").replace(/\p{M}/gu, "") === text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim());

function schedule(hours: Hours[]) {
  const byDay = new Map(hours.map((hour) => [dayOf(hour.dia), hour.horas_24 ? "24 horas" : [hour.hora_inicio, hour.hora_fin].filter(Boolean).join(" a ")]));
  const runs: { from: string; to: string; time: string }[] = [];
  for (const day of week) {
    const time = byDay.get(day);
    const last = runs.at(-1);
    if (!time) continue;
    if (last && last.time === time && week.indexOf(day) === week.indexOf(last.to) + 1) last.to = day;
    else runs.push({ from: day, to: day, time });
  }
  return runs.map(({ from, to, time }) => `${from === to ? from : `${from} a ${to}`} ${time}`).join("; ");
}

function office({ oficina, telefonos }: Contact) {
  if (!oficina) return null;
  const phone = (telefonos ?? []).map(({ tipo_telefono: line }) => clean(line?.telefono ?? line?.numero)).find(Boolean);
  const parts = [
    filled(oficina.direccion),
    phone ? `tel. ${phone}` : "",
    oficina.horarios?.length ? `horario: ${schedule(oficina.horarios)}` : "",
    filled(oficina.enlace),
  ].filter(Boolean);
  return `- ${clean(oficina.nombre)}${oficina.tipo_oficina === "Virtual" ? " (virtual)" : ""}${parts.length ? `: ${parts.join(", ")}` : ""}`;
}

function requirement(item: Requirement) {
  const support = /no tiene/i.test(item.tipo_soporte?.nombre ?? "") ? "" : filled(item.tipo_soporte?.nombre);
  const lines = [`- ${clean(item.nombre)}${support ? ` (${support.toLowerCase()})` : ""}${filled(item.descripcion) ? `: ${inline(item.descripcion)}` : ""}`];
  const fields = item.sub_requisitos.map((field) => clean(field.nombre)).filter(Boolean);
  if (fields.length) lines.push(`  La solicitud pide: ${fields.join("; ")}.`);
  const condition = filled(item.condiciones_presentacion) || (verdictOf(item).includes("condición") ? filled(item.dictamenes.at(-1)?.comentarios) : "");
  if (condition) lines.push(`  Condición: ${inline(condition)}`);
  if (filled(item.enlace_web)) lines.push(`  Enlace: ${clean(item.enlace_web)}`);
  return lines.join("\n");
}

function cost(detail: Detail) {
  const kind = filled(detail.tipo_tarifa);
  const amount = Number(detail.monto);
  const lines = [
    kind && /gratu|sin costo/i.test(kind) ? "- Gratuito" : kind ? `- ${kind}${amount ? `: $${amount.toFixed(2)}` : ""}` : "",
    filled(detail.detalle_tarifa_variable) ? `- Detalle de la tarifa:\n${clean(detail.detalle_tarifa_variable).replace(/^/gm, "  ")}` : "",
    names(detail.modalidades_pagos) ? `- Formas de pago: ${names(detail.modalidades_pagos)}` : "",
    filled(detail.comentario_costo_tramite) ? `- ${inline(detail.comentario_costo_tramite)}` : "",
    filled(detail.enlace_pliego_tarifario) ? `- Pliego tarifario: ${clean(detail.enlace_pliego_tarifario)}` : "",
  ];
  return lines.filter(Boolean);
}

function line(listed: Listed, detail: Detail): CorpusLine {
  const institution = detail.tramite.unidad.institucion;
  const site = website(clean(institution.nombre), institution.descripcion);
  const modality = clean(detail.nombre);
  const generic = /^(modalidad )?[úu]nica\.?$/i.test(modality);
  const name = generic ? clean(detail.tramite.nombre) : `${clean(detail.tramite.nombre)}: ${modality}`;
  const registered = listed.estado_nombre === "inscrito";
  const resolved = registered ? (detail.documento_resolucion?.created_at?.slice(0, 10) ?? null) : null;
  const url = `${portal}/${listed.tramite_id}/detalles/${listed.modalidad_id}`;

  const kept = detail.requisitos.filter((item) => !verdictOf(item).startsWith("no inscrito")).sort((a, b) => a.orden - b.orden);
  const removed = detail.requisitos.filter((item) => verdictOf(item).startsWith("no inscrito"));
  const groups = Map.groupBy(kept, (item) => clean(item.tipo_requisito.nombre).replace(/^Documento anexo – /, ""));

  const validity = [filled(detail.vigencia_tramite), span(detail.cantidad, detail.unidad_tiempo, null), inline(detail.descripcion_vigencia_variable)].filter(Boolean).join(", ");
  const offices = detail.contactos_oficinas.map(office).filter(Boolean);
  const audience = [filled(detail.clasificacion_tramite?.nombre), names(detail.poblaciones)].filter(Boolean).join("; ");

  const sections = [
    `# ${name}`,
    [
      `Institución: ${clean(institution.nombre)}${institution.siglas && !/^\d+$/.test(institution.siglas) ? ` (${clean(institution.siglas)})` : ""}, ${clean(detail.tramite.unidad.nombre)}`,
      registered
        ? `Estado: inscrito en el Registro Nacional de Trámites${detail.numero_expediente ? `, expediente ${clean(detail.numero_expediente)}` : ""}${resolved ? `, resolución del ${resolved}` : ""}`
        : "Estado: en evaluación por el Organismo de Mejora Regulatoria; la información es la que reportó la institución y aún no está verificada",
      filled(detail.descripcion) ? `Descripción: ${inline(detail.descripcion)}` : "",
      audience ? `Para: ${audience}` : "",
      names(detail.categorias_tramites) ? `Categoría: ${names(detail.categorias_tramites)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "## Cómo se presenta",
      names(detail.medios_presentacion) ? `- Medios: ${names(detail.medios_presentacion)}` : "",
      names(detail.niveles_digitalizacion) ? `- Digitalización: ${names(detail.niveles_digitalizacion)}` : "",
      detail.tercero_autorizado === null ? "" : `- Puede hacerlo un tercero autorizado: ${detail.tercero_autorizado ? "sí" : "no"}${filled(detail.comentario_tercero_autorizado) ? ` (${inline(detail.comentario_tercero_autorizado)})` : ""}`,
      filled(detail.periodicidad?.nombre) ? `- Periodicidad: ${clean(detail.periodicidad?.nombre)}` : "",
    ],
    ["## Costo", ...cost(detail)],
    [
      "## Plazos",
      span(detail.plazo_legal_valor, detail.plazo_legal_unidad_tiempo, detail.plazo_legal_tipo_dias) ? `- Plazo máximo legal de respuesta: ${span(detail.plazo_legal_valor, detail.plazo_legal_unidad_tiempo, detail.plazo_legal_tipo_dias)}` : "",
      span(detail.tiempo_promedio_valor, detail.tiempo_promedio_unidad_tiempo, detail.tiempo_promedio_tipo_dias) ? `- Tiempo promedio de respuesta: ${span(detail.tiempo_promedio_valor, detail.tiempo_promedio_unidad_tiempo, detail.tiempo_promedio_tipo_dias)}` : "",
      filled(detail.comentario_plazo_legal) ? `- ${inline(detail.comentario_plazo_legal)}` : "",
      validity ? `- Vigencia de lo que se obtiene: ${validity}` : "",
    ],
    kept.length ? ["## Requisitos", ...[...groups].flatMap(([group, items]) => [`### ${group}`, ...items.map(requirement)])] : [],
    removed.length ? ["## Requisitos que el OMR no inscribió (no se pueden exigir)", ...removed.map((item) => `- ${clean(item.nombre)}`)] : [],
    offices.length ? ["## Dónde hacerlo", ...offices.slice(0, maxOffices), offices.length > maxOffices ? `- Y ${offices.length - maxOffices} oficinas más.` : ""] : [],
  ]
    .map((section) => (Array.isArray(section) ? section.filter(Boolean) : [section]))
    .filter((section) => section.length > 1 || (section.length === 1 && !section[0].startsWith("##")))
    .map((section) => section.join("\n"));

  return {
    path: `${listed.tramite_id}/${listed.modalidad_id}`,
    number: listed.modalidad_id,
    name,
    entity: clean(institution.nombre),
    entity_code: institution.siglas && !/^\d+$/.test(institution.siglas) ? clean(institution.siglas) : null,
    entity_order: null,
    municipality_code: null,
    municipality: null,
    official_url: url,
    modified_at: resolved,
    markdown: `---\n${site ? `url_entidad: ${site}\n` : ""}estado: ${registered ? "inscrito" : "en evaluación"}\n---\n${sections.join("\n\n")}\n`,
  };
}

async function upload(bundle: Buffer, manifest: Record<string, unknown>) {
  const token = process.env.CORPUS_READ_WRITE_TOKEN;
  if (!token) throw new Error("omr: CORPUS_READ_WRITE_TOKEN is required to upload");
  const options = { access: "private" as const, token, addRandomSuffix: false, allowOverwrite: true };
  await put(String(manifest.path), bundle, { ...options, contentType: "application/gzip" });
  await put("corpus/sv/omr/national/latest.json", JSON.stringify(manifest, null, 2), { ...options, contentType: "application/json" });
  console.info(`omr: published ${manifest.path}`);
}

if (args.has("--fresh")) await rm(`${dir}/raw`, { recursive: true, force: true });
await mkdir(`${dir}/raw`, { recursive: true });

const started = Date.now();
const asOf = new Date().toISOString();
const { portal: listed } = await json<{ portal: Listed[] }>("/public_tramites_modalidades?per_page=10000&page=1");
console.info(`omr: ${listed.length} modalities listed`);
const details = await crawl(listed);

const lines = listed.map((item) => line(item, details.get(item.modalidad_id)!));
const markdown = lines.map((entry) => JSON.stringify(entry)).join("\n");
const bundle = gzipSync(markdown);
const generated = new Date().toISOString();
const manifest = {
  version: 1,
  scope: "national",
  source: `${portal}/`,
  generated_at: generated,
  as_of: asOf,
  fichas: lines.length,
  registered: listed.filter((item) => item.estado_nombre === "inscrito").length,
  entities: new Set(lines.map((entry) => entry.entity)).size,
  markdown_bytes: lines.reduce((sum, entry) => sum + Buffer.byteLength(entry.markdown), 0),
  bundle_bytes: bundle.length,
  sha256: createHash("sha256").update(bundle).digest("hex"),
  path: `corpus/sv/omr/national/${generated.replace(/[:.]/g, "-")}/fichas.jsonl.gz`,
};

await writeFile(`${dir}/fichas.jsonl.gz`, bundle);
await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.info(`omr: ${manifest.fichas} records from ${manifest.entities} institutions, ${(manifest.bundle_bytes / 1024).toFixed(0)} KB, ${((Date.now() - started) / 1000).toFixed(0)} s`);
if (args.has("--upload")) await upload(bundle, manifest);
