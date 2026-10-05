import type { Grounding } from "../lib/ui-stream";
import { sha256 } from "./crypto";
import { keywords } from "./normalize";
import { store } from "./store";

export type CachedAnswer = { answer: string; groundings: Grounding[]; followUps: string[] };

const ttl = Number(process.env.ANSWER_CACHE_SECONDS ?? 6 * 3600);

const keyFor = async (question: string) => `answer:v8:${await sha256(keywords(question))}`;

export async function recall(question: string) {
  if (!ttl) return null;
  try {
    return await store.get<CachedAnswer>(await keyFor(question));
  } catch {
    return null;
  }
}

export async function remember(question: string, value: CachedAnswer) {
  if (!ttl || !value.groundings.length) return;
  try {
    await store.set(await keyFor(question), value, ttl);
  } catch {}
}
