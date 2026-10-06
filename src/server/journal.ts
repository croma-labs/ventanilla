import { store } from "./store";

/**
 * One line per answered question, kept for the weekly review that grows the
 * cache, the corpus and the evals. The question is the scrubbed text the model
 * saw. Each day is one list that expires JOURNAL_RETENTION_SECONDS after its
 * first entry (7 days by default); evaluation traffic is never journaled.
 */
export type JournalEntry = {
  at: string;
  path: "cache" | "corpus" | "live" | "conversational";
  outcome: string;
  firstTurn: boolean;
  question: string;
  answer: string;
  authorities: string[];
  evidence: { url: string; origin: string }[];
  cited: string[];
  claims: number;
  unsupported: number;
  corpus: string | null;
  model: string;
  timings: Record<string, number>;
};

const retention = Number(process.env.JOURNAL_RETENTION_SECONDS ?? 7 * 24 * 3600);

const dayOf = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);

export const journalKey = (date: Date) => `journal:${dayOf(date)}`;

export async function journal(entry: JournalEntry) {
  if (!retention) return;
  try {
    await store.push(journalKey(new Date(entry.at)), entry, retention);
  } catch {}
}
