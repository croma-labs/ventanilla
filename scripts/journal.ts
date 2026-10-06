import { mkdir, writeFile } from "node:fs/promises";
import { Redis } from "@upstash/redis";
import { keywords } from "../src/server/normalize.ts";

// Pulls the last week of the answer journal from Upstash into .journal/
// (gitignored) and prints what the weekly review starts from: how questions
// were answered, how fast, which ones repeat, and which the corpus missed.
//   npm run journal                 production
//   npm run journal -- --env dev    local and preview traffic

type Entry = {
  at: string;
  path: string;
  outcome: string;
  question: string;
  claims: number;
  unsupported: number;
  timings: Record<string, number>;
};

const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = process.env;
if (!url || !token) throw new Error("journal: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");

const env = process.argv.includes("--env") ? process.argv[process.argv.indexOf("--env") + 1] : "production";
const prefix = `ventanilla:${env === "production" ? "" : "dev:"}${process.env.COUNTRY ?? "co"}:`;
const redis = new Redis({ url, token });

const day = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() - offset * 86_400_000));
const days = Array.from({ length: 7 }, (_, offset) => day(offset)).reverse();

const entries: Entry[] = [];
for (const date of days) {
  const rows = await redis.lrange<Entry | string>(`${prefix}journal:${date}`, 0, -1);
  for (const row of rows) entries.push(typeof row === "string" ? JSON.parse(row) : row);
}

await mkdir(".journal", { recursive: true });
const file = `.journal/${days[0]}_${days.at(-1)}.${env}.jsonl`;
await writeFile(file, entries.map((entry) => JSON.stringify(entry)).join("\n"));

const median = (values: number[]) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const count = <T>(items: T[], key: (item: T) => string) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`journal: ${entries.length} answers, ${days[0]} to ${days.at(-1)} (${env}) -> ${file}\n`);
for (const [path, total] of count(entries, (entry) => entry.path)) {
  const these = entries.filter((entry) => entry.path === path);
  const claims = these.reduce((sum, entry) => sum + entry.claims, 0);
  const backed = claims - these.reduce((sum, entry) => sum + entry.unsupported, 0);
  console.log(
    `${path.padEnd(15)} ${String(total).padStart(5)}  first word ${median(these.map((entry) => entry.timings.firstTextMs))} ms, answer ${median(these.map((entry) => entry.timings.textDoneMs))} ms, claims backed ${claims ? Math.round((100 * backed) / claims) : "-"}%`,
  );
}
console.log("\nMost asked (by keywords):");
for (const [key, total] of count(entries, (entry) => keywords(entry.question)).slice(0, 15)) console.log(`  ${String(total).padStart(4)}  ${key}`);
console.log("\nAnswered by live search (corpus gaps):");
for (const [key, total] of count(entries.filter((entry) => entry.path === "live"), (entry) => keywords(entry.question)).slice(0, 15)) console.log(`  ${String(total).padStart(4)}  ${key}`);
