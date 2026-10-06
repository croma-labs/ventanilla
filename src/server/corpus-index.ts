import MiniSearch, { type Options } from "minisearch";
import { fold } from "./normalize.ts";

export type CorpusLine = {
  path: string;
  number: number;
  name: string | null;
  entity: string | null;
  entity_code: string | null;
  entity_order: string | null;
  municipality_code: string | null;
  municipality: string | null;
  official_url: string;
  modified_at: string | null;
  markdown: string;
};

export type CorpusDoc = { id: number; name: string; entity: string; host: string; url: string; path: string; modified: string; text: string };

export const corpusDir = ".corpus";
export const corpusFiles = { docs: `${corpusDir}/fichas.jsonl`, index: `${corpusDir}/index.json`, manifest: `${corpusDir}/manifest.json` };

const stopwords = new Set(
  "a al ante como con cual cuales cuando de del desde donde el ella en entre es esta este esto hay la las le les lo los me mi mis para pero por que se si sin sobre su sus te tu tus un una uno y o u ni ya mas muy hacer hago puedo debo necesito quiero saco sacar tramite tramites".split(" "),
);

/** Spanish words cut to their first six letters: "renovación", "renovar" and "renueva" mostly meet at "renova". */
const stem = (word: string) => (word.length > 6 ? word.slice(0, 6) : word);

export const processTerm = (term: string) => {
  const word = fold(term);
  if (!word || stopwords.has(word)) return null;
  return /^\d+$/.test(word) ? word : stem(word);
};

export const indexOptions: Options<CorpusDoc> = {
  fields: ["name", "entity", "text"],
  storeFields: ["name", "entity", "host", "url", "path", "modified"],
  processTerm,
  searchOptions: { boost: { name: 3, entity: 1.5 }, prefix: (term) => term.length > 3, fuzzy: (term) => (term.length > 5 ? 0.15 : false), combineWith: "OR" },
};

const hostOf = (url: string | undefined) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
};

/** The ficha's body without its header, which only repeats the fields stored beside it. */
const bodyOf = (markdown: string) => markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

export function toDoc(line: CorpusLine): CorpusDoc {
  const entityUrl = line.markdown.match(/^url_entidad: (\S+)$/m)?.[1];
  const modified = line.modified_at?.slice(0, 10) ?? "";
  // What the answer needs to link the entity to its own site and to date a fee.
  const lead = [
    line.entity ? `Entidad: ${line.entity}${entityUrl ? ` (sitio web: ${entityUrl})` : ""}` : null,
    modified ? `Ficha oficial actualizada el ${modified}` : null,
  ].filter(Boolean);
  return {
    id: line.number,
    name: line.name ?? `Trámite ${line.number}`,
    entity: line.entity ?? "",
    host: hostOf(entityUrl),
    url: line.official_url,
    path: line.path,
    modified,
    text: [...lead, bodyOf(line.markdown)].join("\n"),
  };
}

export const buildIndex = (docs: CorpusDoc[]) => {
  const index = new MiniSearch<CorpusDoc>(indexOptions);
  index.addAll(docs);
  return index;
};

export const loadIndex = (json: string) => MiniSearch.loadJSON<CorpusDoc>(json, indexOptions);
