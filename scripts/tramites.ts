import { readFile, writeFile } from "node:fs/promises";
import type { TramiteContent } from "../src/countries/types.ts";
import { ask, under, type Reply } from "./ask.ts";

const country = process.env.COUNTRY ?? "co";
const base = process.env.EVAL_URL ?? "http://localhost:5201";
const key = process.env.EVAL_KEY;
if (!key) throw new Error("EVAL_KEY is required (same value as the server)");

const { tramites } = await import(`../src/countries/${country}/tramites.ts`);
const output = new URL(`../src/countries/${country}/tramites.json`, import.meta.url);
const content: Record<string, TramiteContent> = JSON.parse(await readFile(output, "utf8").catch(() => "{}"));
const only = process.argv.slice(2);
const attempts = 3;
const bar = { claims: 3, support: 0.75, length: 280 };
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const grade = (reply: Reply, domains: readonly string[]) => {
  const checks = reply.metadata.diagnostics?.checks ?? [];
  const supported = checks.filter((check) => check.status === "found").length;
  const competent = reply.sources.some(({ url }) => domains.some((domain) => under(url, domain)));
  const passes = reply.metadata.verified === true && competent && checks.length >= bar.claims && supported / checks.length >= bar.support && reply.answer.length >= bar.length;
  return { passes, claims: checks.length, supported, competent, score: checks.length ? supported / checks.length : 0 };
};

async function build(tramite: { slug: string; question: string; domains: readonly string[] }) {
  let best: { reply: Reply; grade: ReturnType<typeof grade> } | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const reply = await ask(base, key!, tramite.question).catch((error) => (console.log(`  ${tramite.slug} attempt ${attempt}: ${error}`), null));
    if (!reply) continue;
    const graded = grade(reply, tramite.domains);
    console.log(`  ${tramite.slug} attempt ${attempt}: ${graded.passes ? "pass" : "fail"} claims ${graded.supported}/${graded.claims} competent ${graded.competent} ${reply.ms}ms`);
    if (graded.passes && (!best || graded.score > best.grade.score)) best = { reply, grade: graded };
    if (graded.passes && graded.score === 1) break;
  }
  return best;
}

const queue = tramites.filter((tramite: { slug: string; hold?: string }) => !tramite.hold && (!only.length || only.includes(tramite.slug)));
const failed: string[] = [];
for (const tramite of queue) {
  const best = await build(tramite);
  if (!best) {
    failed.push(tramite.slug);
    continue;
  }
  content[tramite.slug] = { answer: best.reply.answer.trim(), sources: best.reply.sources, verifiedAt: today, claims: best.grade.claims, supported: best.grade.supported };
  await writeFile(output, `${JSON.stringify(content, null, 2)}\n`);
}
console.log(`\npublished ${queue.length - failed.length}/${queue.length}${failed.length ? `, held back: ${failed.join(" ")}` : ""}`);
