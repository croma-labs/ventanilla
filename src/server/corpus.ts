import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type MiniSearch from "minisearch";
import type { SearchResult } from "minisearch";
import { corpusFiles, loadIndex, type CorpusDoc } from "./corpus-index.ts";
import type { Candidate } from "./research";

type Loaded = { index: MiniSearch<CorpusDoc>; docs: Map<number, CorpusDoc>; version: string };

/** `named`: a query term matched the record's name, not only its body, so the question is about this record's subject. */
export type CorpusHit = Candidate & { corpusScore: number; named: boolean; host: string };

const maxText = 9_000;
const maxHits = 3;

let loading: Promise<Loaded | null> | null = null;

/** The corpus, read once per instance from the files the build shipped with the function; null when it was not shipped. */
export function corpus() {
  loading ??= (async () => {
    try {
      const root = process.cwd();
      const [json, lines, manifest] = await Promise.all([
        readFile(join(root, corpusFiles.index), "utf8"),
        readFile(join(root, corpusFiles.docs), "utf8"),
        readFile(join(root, corpusFiles.manifest), "utf8").catch(() => "{}"),
      ]);
      const docs = new Map<number, CorpusDoc>();
      for (const line of lines.split("\n")) {
        if (!line) continue;
        const doc = JSON.parse(line) as CorpusDoc;
        docs.set(doc.id, doc);
      }
      const { sha256 = "" } = JSON.parse(manifest) as { sha256?: string };
      return { index: loadIndex(json), docs, version: sha256.slice(0, 12) || "local" };
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Which corpus this instance answers from; null without one. */
export const corpusVersion = async () => (await corpus())?.version ?? null;

const under = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * The records that best answer the queries, from the entities the router named
 * (all of them when it named none). Each query is searched on its own and a
 * record keeps its best score, so "requisitos" and "costo" queries both count.
 */
export async function searchCorpus(queries: string[], domains: string[]): Promise<CorpusHit[]> {
  const loaded = await corpus();
  if (!loaded) return [];
  const scoped = domains.filter((domain) => domain !== "gov.co");
  // A record whose entity publishes no website cannot be scoped by domain, so it stays in every scope.
  const filter = scoped.length ? (result: SearchResult) => !result.host || scoped.some((domain) => under(String(result.host), domain)) : undefined;
  const best = new Map<number, number>();
  const named = new Set<number>();
  for (const query of queries) {
    for (const result of loaded.index.search(query, { filter })) {
      best.set(result.id as number, Math.max(best.get(result.id as number) ?? 0, result.score));
      if (Object.values(result.match).some((fields) => fields.includes("name"))) named.add(result.id as number);
    }
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxHits)
    .flatMap(([id, score]) => {
      const doc = loaded.docs.get(id);
      if (!doc) return [];
      return [
        {
          id: `c${id}`,
          origin: "corpus",
          title: `${doc.name} (${doc.entity})`,
          url: doc.url,
          text: doc.text.length > maxText ? doc.text.slice(0, maxText) : doc.text,
          read: true,
          authority: true,
          corpusScore: score,
          named: named.has(id),
          host: doc.host,
        },
      ];
    });
}
