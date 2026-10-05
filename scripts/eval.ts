import { mkdir, readFile, writeFile } from "node:fs/promises";

type Case = { id: string; question: string; domains?: string[]; facts?: string[]; forbidden?: string[]; expect?: "answer" | "decline" | "conversational" };

type Diagnostics = {
  route?: { authorities: string[] };
  considered?: number;
  kept?: { url: string; score: number; authority: boolean; read: boolean }[];
  checks?: { claim: string; status: string }[];
  timings?: Record<string, number>;
};

const country = process.env.COUNTRY ?? "co";
const base = process.env.EVAL_URL ?? "http://localhost:5201";
const key = process.env.EVAL_KEY;
if (!key) throw new Error("EVAL_KEY is required (same value as the server)");

const only = process.argv.slice(2);
const cases: Case[] = JSON.parse(await readFile(new URL(`../evals/${country}.json`, import.meta.url), "utf8"));
const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");
const matches = (pattern: string, text: string) => new RegExp(plain(pattern), "i").test(plain(text));
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const under = (url: string, domain: string) => host(url) === domain || host(url).endsWith(`.${domain}`);

async function ask(question: string, retries = 1): Promise<Awaited<ReturnType<typeof once>>> {
  try {
    return await once(question);
  } catch (error) {
    const network = error instanceof TypeError && /fetch failed|terminated/.test(error.message);
    if (network && retries > 0) return ask(question, retries - 1);
    throw error;
  }
}

async function once(question: string) {
  const started = Date.now();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-eval-key": key! },
    body: JSON.stringify({ messages: [{ role: "user", text: question }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let answer = "";
  let sources: string[] = [];
  let metadata: { verified?: boolean; diagnostics?: Diagnostics } = {};
  for (const block of (await response.text()).split("\n\n")) {
    if (!block.startsWith("data: ") || block === "data: [DONE]") continue;
    const chunk = JSON.parse(block.slice(6));
    if (chunk.type === "text-delta") answer += chunk.delta;
    if (chunk.type === "data-search") sources = chunk.data.groundings.map((grounding: { url: string }) => grounding.url);
    if (chunk.type === "finish") metadata = chunk.messageMetadata ?? {};
  }
  return { answer, sources, metadata, ms: Date.now() - started };
}

const results = [];
for (const test of cases.filter((test) => !only.length || only.includes(test.id))) {
  const expect = test.expect ?? "answer";
  try {
    const { answer, sources, metadata, ms } = await ask(test.question);
    const diagnostics = metadata.diagnostics ?? {};
    const checks = diagnostics.checks ?? [];
    const result = {
      id: test.id,
      ms,
      cited: sources.length,
      competent: test.domains ? sources.some((url) => test.domains!.some((domain) => under(url, domain))) : null,
      routed: test.domains ? (diagnostics.route?.authorities ?? []).some((domain) => test.domains!.includes(domain)) : null,
      facts: (test.facts ?? []).filter((fact) => !matches(fact, answer)),
      leaked: (test.forbidden ?? []).filter((pattern) => matches(pattern, answer)),
      claims: checks.length,
      unsupported: checks.filter((check) => check.status !== "found").length,
      kept: diagnostics.kept?.length ?? 0,
      read: diagnostics.kept?.filter((source) => source.read).length ?? 0,
      offTopicKept: diagnostics.kept?.filter((source) => source.score < 2).length ?? 0,
      answer,
      sources,
      diagnostics,
    };
    const pass =
      expect === "answer"
        ? result.cited > 0 && result.competent !== false && !result.facts.length && !result.leaked.length
        : expect === "decline"
          ? result.cited === 0
          : result.cited === 0 && answer.length > 0;
    results.push({ ...result, expect, pass });
    console.log(
      `${pass ? "PASS" : "FAIL"}  ${test.id.padEnd(18)} ${String(ms).padStart(6)}ms  cited ${result.cited}  competent ${result.competent ?? "-"}  routed ${result.routed ?? "-"}  claims ${result.claims - result.unsupported}/${result.claims}  read ${result.read}${result.facts.length ? `  missing ${result.facts.join(", ")}` : ""}${result.leaked.length ? `  LEAKED ${result.leaked.join(", ")}` : ""}`,
    );
  } catch (error) {
    results.push({ id: test.id, expect, pass: false, error: String(error) });
    console.log(`FAIL  ${test.id.padEnd(18)} ${String(error)}`);
  }
}

const passed = results.filter((result) => result.pass).length;
const answered = results.filter((result) => "claims" in result && result.expect === "answer") as { claims: number; unsupported: number; ms: number; competent: boolean | null }[];
const claims = answered.reduce((sum, result) => sum + result.claims, 0);
const unsupported = answered.reduce((sum, result) => sum + result.unsupported, 0);
const latencies = answered.map((result) => result.ms).sort((a, b) => a - b);
const summary = {
  base,
  passed: `${passed}/${results.length}`,
  competentSource: `${answered.filter((result) => result.competent).length}/${answered.length}`,
  claimSupport: claims ? `${(((claims - unsupported) / claims) * 100).toFixed(1)}% of ${claims} draft claims found in sources` : "n/a",
  p50ms: latencies[Math.floor(latencies.length / 2)] ?? 0,
  p90ms: latencies[Math.floor(latencies.length * 0.9)] ?? 0,
};
console.log("\n", summary);
await mkdir(new URL("../evals/results/", import.meta.url), { recursive: true });
await writeFile(new URL(`../evals/results/${country}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url), JSON.stringify({ summary, results }, null, 2));
process.exitCode = passed === results.length ? 0 : 1;
