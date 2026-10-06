import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { get } from "@vercel/blob";
import { buildIndex, corpusDir, corpusFiles, toDoc, type CorpusLine } from "../src/server/corpus-index.ts";

// Pulls the procedures corpus from its private store into .corpus/ (gitignored)
// and builds the search index the chat function loads. Runs before every build.
// On Vercel a missing token or a failed pull fails the build; locally the
// corpus is optional and the assistant falls back to live search without it.

const token = process.env.CORPUS_READ_WRITE_TOKEN;
const scope = process.env.CORPUS_SCOPE ?? "national";
const required = !!process.env.VERCEL;

async function bytes(path: string) {
  const found = await get(path, { access: "private", token });
  if (!found) throw new Error(`corpus: ${path} not found`);
  return Buffer.from(await new Response(found.stream).arrayBuffer());
}

async function pull() {
  const started = Date.now();
  const manifest = JSON.parse((await bytes(`corpus/co/suit/${scope}/latest.json`)).toString("utf8"));
  const bundle = await bytes(manifest.path);
  if (createHash("sha256").update(bundle).digest("hex") !== manifest.sha256) throw new Error("corpus: bundle does not match its manifest");

  const lines: CorpusLine[] = gunzipSync(bundle).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));
  const docs = lines.map(toDoc);
  const index = buildIndex(docs);

  await mkdir(corpusDir, { recursive: true });
  await writeFile(corpusFiles.docs, docs.map((doc) => JSON.stringify(doc)).join("\n"));
  await writeFile(corpusFiles.index, JSON.stringify(index));
  await writeFile(corpusFiles.manifest, JSON.stringify({ ...manifest, pulled_at: new Date().toISOString() }, null, 2));
  console.info(`corpus: ${docs.length} fichas (${manifest.scope}, ${manifest.generated_at}) indexed in ${Date.now() - started} ms`);
}

if (!token) {
  if (required) throw new Error("corpus: CORPUS_READ_WRITE_TOKEN is required to build on Vercel");
  console.warn("corpus: no CORPUS_READ_WRITE_TOKEN, skipping (answers use live search only)");
} else {
  await pull().catch((error) => {
    if (required) throw error;
    console.warn("corpus: pull failed, skipping:", error instanceof Error ? error.message : error);
  });
}
