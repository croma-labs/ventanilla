import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { put } from "@vercel/blob";
import type { CorpusLine } from "../src/server/corpus-index.ts";

// Builds Argentina's procedures corpus from the two official catalogues that
// publish one page per procedure: the national portal's services
// (argentina.gob.ar/servicio) and the City of Buenos Aires' Guía de Trámites
// (buenosaires.gob.ar/tramites), in the same shape as the other countries'
// corpora, and uploads it where scripts/corpus.ts pulls it from. Pages are kept
// in .ar/raw/ (gitignored) so an interrupted crawl resumes where it stopped.
//   npm run ar                build .ar/fichas.jsonl.gz
//   npm run ar -- --upload    and publish it as the latest corpus
//   npm run ar -- --fresh     refetch every page

const dir = ".ar";
const concurrency = 4;
const userAgent = "Ventanilla/1.0 (+https://github.com/croma-labs/ventanilla)";
const nation = { origin: "https://www.argentina.gob.ar", site: "https://www.argentina.gob.ar/", label: "nacional, vale en todo el país" };
const city = { origin: "https://buenosaires.gob.ar", site: "https://buenosaires.gob.ar/", label: "Ciudad Autónoma de Buenos Aires, vale solo en la Ciudad" };
const cityName = "Gobierno de la Ciudad de Buenos Aires";

type Listed = { source: "nacion" | "caba"; slug: string; url: string; title?: string; area?: string; modes?: string[]; modified?: string };

const args = new Set(process.argv.slice(2));

async function page(url: string, attempt = 1): Promise<string | null> {
  const response = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/html,application/xml" }, signal: AbortSignal.timeout(45_000) }).catch((error) => error as Error);
  if (response instanceof Response && response.ok) return response.text();
  if (response instanceof Response && [403, 404, 410].includes(response.status)) return null;
  if (attempt >= 4) throw new Error(`ar: ${url} failed: ${response instanceof Response ? response.status : response.message}`);
  await new Promise((resolve) => setTimeout(resolve, 2_500 * attempt));
  return page(url, attempt + 1);
}

async function cached(listed: Listed) {
  const file = `${dir}/raw/${listed.source}/${listed.slug}.html`;
  const kept = await readFile(file, "utf8").catch(() => null);
  if (kept !== null) return kept;
  const fetched = (await page(listed.url)) ?? "";
  await writeFile(file, fetched);
  return fetched;
}

async function pool<Item, Result>(items: Item[], work: (item: Item) => Promise<Result>, label: string) {
  const results = new Array<Result>(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
      if (++done % 250 === 0) console.info(`ar: ${done}/${items.length} ${label}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const named: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", iquest: "¿", iexcl: "¡", ordm: "º", ordf: "ª", deg: "°", laquo: "«", raquo: "»",
  ndash: "–", mdash: "–", hellip: "…", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", bull: "•", middot: "·",
};

const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name] ?? entity)
    .replace(/ /g, " ");

const unmask = (hex: string) => {
  const key = parseInt(hex.slice(0, 2), 16);
  return (hex.slice(2).match(/../g) ?? []).map((byte) => String.fromCharCode(parseInt(byte, 16) ^ key)).join("");
};

const flat = (text: string) => decode(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const absolute = (href: string, base: string) => {
  const target = decode(href).replace(/^blank:#/, "").trim();
  if (!target || /^(#|javascript:|mailto:|tel:|\/cdn-cgi\/)/i.test(target)) return null;
  try {
    const url = new URL(target, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

function markdown(html: string, base: string) {
  const anchor = (_: string, href: string, label: string) => {
    const text = flat(label);
    const url = absolute(href, base);
    return !text ? "" : url && url !== text ? `[${text.replace(/[[\]]/g, "")}](${url.replace(/[()\s]/g, encodeURIComponent)})` : text;
  };
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|svg|form|noscript|nav|button|iframe|picture|figure|select)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<span[^>]*data-cfemail="([0-9a-f]+)"[^>]*>[\s\S]*?<\/span>/gi, (_, hex) => unmask(hex))
      .replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, anchor)
      .replace(/<h([1-6])\b[^>]*>/gi, (_, level) => `\n\n${"#".repeat(Math.min(Math.max(Number(level), 2), 4))} `)
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<\/(p|div|section|article|h[1-6]|li|ul|ol|tr|table|dd|dt)>|<(br|hr)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/^ +| +$/gm, "")
    .replace(/^-->$/gm, "")
    .replace(/^(#{2,4}) *\n+(?![#-])/gm, "$1 ")
    .replace(/^-\s*\n+#{2,4} (.+)$/gm, "- $1:")
    .replace(/^-\s*\n+(?![-#])/gm, "- ")
    .replace(/^(#{2,4}|-|\|)\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const meta = (html: string, name: string) => {
  const tag = html.match(new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]*>`, "i"))?.[0];
  return tag ? flat(tag.match(/content="([^"]*)"/i)?.[1] ?? "") : "";
};

const heading = (html: string) => flat([...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].at(-1)?.[1] ?? "");

const withoutTitle = (body: string, title: string) => body.replace(new RegExp(`^#{2,4} ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`), "").trim();

async function listNation(): Promise<Listed[]> {
  const index = (await page(`${nation.origin}/sitemap.xml`)) ?? "";
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => decode(url));
  const pages = await Promise.all(maps.map((url) => page(url)));
  const found = new Map<string, Listed>();
  for (const xml of pages) {
    for (const [, url, modified] of (xml ?? "").matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
      const slug = url.match(/^https:\/\/www\.argentina\.gob\.ar\/servicio\/([a-z0-9-]+)$/)?.[1];
      if (slug) found.set(slug, { source: "nacion", slug, url, modified: modified?.slice(0, 10) });
    }
  }
  return [...found.values()];
}

async function listCity(): Promise<Listed[]> {
  const found = new Map<string, Listed>();
  const dated = new Map<string, string>();
  const sitemap = (await page(`${city.origin}/sitemap-Tramite%20Obelisco%20y%20Tramite%20-%20D8.xml`)) ?? "";
  for (const [, slug, modified] of sitemap.matchAll(/<loc>[^<]*\/tramites\/([a-z0-9-]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) dated.set(slug, modified.slice(0, 10));

  const first = (await page(`${city.origin}/gobierno/tramites`)) ?? "";
  const total = Number(first.match(/(\d+) resultados/)?.[1] ?? 0);
  const perPage = [...first.matchAll(/<article class="card card-vertical/g)].length || 9;
  const numbers = Array.from({ length: Math.ceil(total / perPage) }, (_, index) => index);
  const listings = await pool(numbers, (number) => (number ? page(`${city.origin}/gobierno/tramites?page=${number}`) : Promise.resolve(first)), "listing pages");
  for (const html of listings) {
    for (const card of (html ?? "").split(/<article class="card card-vertical/).slice(1)) {
      const link = card.match(/<a href="\/tramites\/([a-z0-9-]+)" class="card-title-link">([\s\S]*?)<\/a>/);
      if (!link) continue;
      const [, slug, title] = link;
      found.set(slug, {
        source: "caba",
        slug,
        url: `${city.origin}/tramites/${slug}`,
        title: flat(title),
        modes: [...card.matchAll(/badge-p-default[^>]*>([\s\S]*?)<\/span>/g)].map(([, mode]) => flat(mode)).filter(Boolean),
        area: flat(card.match(/badge-s-default[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? ""),
        modified: dated.get(slug),
      });
    }
  }
  return [...found.values()];
}

function nationRecord(listed: Listed, html: string) {
  const title = heading(html);
  if (!title || /No encontramos la página/i.test(title)) return null;
  const main = html.match(/<main\b[\s\S]*<\/main>/i)?.[0] ?? "";
  const crumbs = [...(main.match(/<ol class="breadcrumb"[\s\S]*?<\/ol>/i)?.[0] ?? "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(([, crumb]) => flat(crumb)).slice(1, -1);
  const body = withoutTitle(markdown(main.replace(/<ol class="breadcrumb"[\s\S]*?<\/ol>/i, ""), listed.url).split(/^Compartir en$/m)[0], title);
  if (body.length < 120) return null;
  const entity = crumbs.length ? [...crumbs].reverse().join(", ") : "Gobierno Nacional";
  const modified = meta(html, "article:modified_time").slice(0, 10) || listed.modified || null;
  return { title, entity, modified, site: nation.site, lead: [`Organismo: ${entity}`, `Alcance: ${nation.label}`], body };
}

function cityRecord(listed: Listed, html: string) {
  const title = heading(html) || listed.title || "";
  if (!title || /Acceso denegado|Página no encontrada/i.test(title)) return null;
  const article = html.match(/<article\b[^>]*node--type-tramite[\s\S]*<\/article>/i)?.[0] ?? html.match(/<main\b[\s\S]*<\/main>/i)?.[0] ?? "";
  const body = withoutTitle(markdown(article, listed.url), title);
  if (body.length < 120) return null;
  const entity = listed.area && listed.area !== title && listed.area !== listed.title ? `${cityName}, ${listed.area}` : cityName;
  const summary = meta(html, "description");
  return {
    title,
    entity,
    modified: listed.modified ?? null,
    site: city.site,
    lead: [`Organismo: ${entity}`, `Alcance: ${city.label}`, listed.modes?.length ? `Modalidad: ${listed.modes.join(", ")}` : "", summary ? `Descripción: ${summary}` : ""].filter(Boolean),
    body,
  };
}

async function upload(bundle: Buffer, manifest: Record<string, unknown>) {
  const token = process.env.CORPUS_READ_WRITE_TOKEN;
  if (!token) throw new Error("ar: CORPUS_READ_WRITE_TOKEN is required to upload");
  const options = { access: "private" as const, token, addRandomSuffix: false, allowOverwrite: true };
  await put(String(manifest.path), bundle, { ...options, contentType: "application/gzip" });
  await put("corpus/ar/tramites/national/latest.json", JSON.stringify(manifest, null, 2), { ...options, contentType: "application/json" });
  console.info(`ar: published ${manifest.path}`);
}

if (args.has("--fresh")) await rm(`${dir}/raw`, { recursive: true, force: true });
await mkdir(`${dir}/raw/nacion`, { recursive: true });
await mkdir(`${dir}/raw/caba`, { recursive: true });

const started = Date.now();
const asOf = new Date().toISOString();
const listed = [...(await listNation()), ...(await listCity())].sort((a, b) => a.source.localeCompare(b.source) || a.slug.localeCompare(b.slug));
console.info(`ar: ${listed.filter((item) => item.source === "nacion").length} national services and ${listed.filter((item) => item.source === "caba").length} City procedures listed`);
const pages = await pool(listed, cached, "pages");

const lines: CorpusLine[] = listed.flatMap((item, index) => {
  const record = pages[index] ? (item.source === "nacion" ? nationRecord(item, pages[index]) : cityRecord(item, pages[index])) : null;
  if (!record) return [];
  return [
    {
      path: `${item.source}/${item.slug}`,
      number: index + 1,
      name: record.title,
      entity: record.entity,
      entity_code: null,
      entity_order: item.source === "nacion" ? "nacional" : "ciudad",
      municipality_code: null,
      municipality: item.source === "caba" ? "Ciudad Autónoma de Buenos Aires" : null,
      official_url: item.url,
      modified_at: record.modified,
      markdown: `---\nurl_entidad: ${record.site}\nalcance: ${item.source}\n---\n# ${record.title}\n${record.lead.join("\n")}\n\n${record.body}\n`,
    },
  ];
});

const bundle = gzipSync(lines.map((entry) => JSON.stringify(entry)).join("\n"));
const generated = new Date().toISOString();
const manifest = {
  version: 1,
  scope: "national",
  source: `${nation.origin}/servicio, ${city.origin}/tramites`,
  generated_at: generated,
  as_of: asOf,
  fichas: lines.length,
  national: lines.filter((entry) => entry.entity_order === "nacional").length,
  city: lines.filter((entry) => entry.entity_order === "ciudad").length,
  entities: new Set(lines.map((entry) => entry.entity)).size,
  markdown_bytes: lines.reduce((sum, entry) => sum + Buffer.byteLength(entry.markdown), 0),
  bundle_bytes: bundle.length,
  sha256: createHash("sha256").update(bundle).digest("hex"),
  path: `corpus/ar/tramites/national/${generated.replace(/[:.]/g, "-")}/fichas.jsonl.gz`,
};

await writeFile(`${dir}/fichas.jsonl.gz`, bundle);
await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.info(`ar: ${manifest.fichas} records (${manifest.national} national, ${manifest.city} City) from ${manifest.entities} bodies, ${(manifest.bundle_bytes / 1024).toFixed(0)} KB, ${((Date.now() - started) / 1000).toFixed(0)} s`);
if (args.has("--upload")) await upload(bundle, manifest);
