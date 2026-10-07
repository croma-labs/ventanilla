import type { Grounding } from "../lib/ui-stream";
import { corpusVersion } from "./corpus";
import { sha256 } from "./crypto";
import { keywords } from "./normalize";
import { store } from "./store";

/** `corpus` is the corpus version an answer was written from; a new corpus retires it. */
export type CachedAnswer = { answer: string; groundings: Grounding[]; followUps: string[]; corpus?: string };

const day = 24 * 3600;
/** Answers from live search: nothing says when those pages change, so they age out. */
const liveTtl = Number(process.env.ANSWER_CACHE_SECONDS ?? 7 * day);
/** Answers from the corpus: they live until the corpus they came from is replaced. */
const corpusTtl = Number(process.env.CORPUS_ANSWER_CACHE_SECONDS ?? 30 * day);

const keyFor = async (question: string) => `answer:v10:${await sha256(keywords(question))}`;

export async function recall(question: string) {
  if (!liveTtl && !corpusTtl) return null;
  try {
    const cached = await store.get<CachedAnswer>(await keyFor(question));
    if (!cached) return null;
    if (cached.corpus && cached.corpus !== (await corpusVersion())) return null;
    return cached;
  } catch {
    return null;
  }
}

export async function remember(question: string, value: CachedAnswer) {
  const ttl = value.corpus ? corpusTtl : liveTtl;
  if (!ttl || !value.groundings.length) return;
  try {
    await store.set(await keyFor(question), value, ttl);
  } catch {}
}
