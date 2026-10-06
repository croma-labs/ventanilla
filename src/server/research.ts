import { generateText, Output } from "ai";
import { z } from "zod";
import { searchCorpus, type CorpusHit } from "./corpus";
import type { Resolved } from "./model";
import type { Source, SourceTool, ToolContext, ToolResult } from "./tools/kit";
import { clip } from "./tools/kit";

export type Authority = { domain: string; covers: string; pages?: readonly { url: string; title: string }[] };

export type Dataset = { tool: SourceTool; covers: string; reader?: (candidate: Candidate, context: ToolContext) => Promise<string | null> };

export type ResearchConfig = {
  web: SourceTool;
  read: SourceTool;
  datasets: Record<string, Dataset>;
  authorities: readonly Authority[];
};

export type Candidate = { id: string; origin: string; title: string; url: string; text: string; ref?: string; score?: number; read?: boolean; authority?: boolean };

export type Route = { inScope: boolean; authorities: string[]; queries: string[]; datasets: Record<string, string | null> };

export type Research = { route: Route | null; candidates: Candidate[]; considered: number; timings: Record<string, number>; corpus?: boolean };

const deadlines = { route: 4_000, search: 8_000, dataset: 7_000, judge: 5_000, read: 7_000 };
const maxEvidence = 30_000;
const keepScore = 2;
/** The judge's score for a source that answers the question outright. Only corpus records scored so answer on their own. */
const answersScore = 3;

/** Corpus hits as candidates: the lexical score travels in the origin for the diagnostics, the judge decides the real score. */
const asCandidates = (hits: CorpusHit[]): Candidate[] => hits.map(({ corpusScore, named, host, ...hit }) => ({ ...hit, origin: `corpus:${corpusScore.toFixed(1)}` }));

/** The records that answer on their own: the judge scores them as the answer and the question names their subject. A record matched only in its body shares words with the question, not its topic. */
const answering = (hits: CorpusHit[], scores: Map<string, number> | null) =>
  scores ? asCandidates(hits.filter((hit) => hit.named && scores.get(hit.id) === answersScore)).map((record) => ({ ...record, score: answersScore })) : [];

const within = <T>(promise: Promise<T>, ms: number, fallback: T) =>
  Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const under = (url: string, domain: string) => {
  const host = domainOf(url);
  return host === domain || host.endsWith(`.${domain}`);
};

function collect(origin: string, result: ToolResult | null): Candidate[] {
  if (!result || "error" in result) return [];
  const found: Candidate[] = [];
  const titles = new Map(result.sources.map((source: Source) => [source.url, source.title]));
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (typeof item.url === "string" && item.url.startsWith("http")) {
      const text = ["excerpt", "summary", "decision", "text"].map((key) => item[key]).filter((part) => typeof part === "string").join(" ");
      found.push({
        id: `${origin}-${found.length}`,
        origin,
        url: item.url,
        title: String(item.title ?? item.number ?? titles.get(item.url) ?? domainOf(item.url)),
        text: clip(text, 2400) ?? "",
        ref: typeof item.id === "string" ? item.id : undefined,
      });
      return;
    }
    Object.values(item).forEach(walk);
  };
  walk(result.results);
  return found;
}

const plan = (config: ResearchConfig, question: string, context: string) => `Route a citizen's question to the official sources that can answer it.
QUESTION: ${question}${context ? `\nCONVERSATION SO FAR: ${context}` : ""}

AUTHORITIES (domain: what it covers):
${config.authorities.map((authority) => `- ${authority.domain}: ${authority.covers}`).join("\n")}

DATASETS (name: what it covers):
${Object.entries(config.datasets)
  .map(([name, dataset]) => `- ${name}: ${dataset.covers}`)
  .join("\n")}

Return:
- in_scope: true if the question is about the State, public services, procedures, rights, laws or taxes of this country; false for anything else (sports, trivia, general knowledge, chit-chat).
- authorities: the 1 or 2 domains legally competent for this question, most competent first. Empty only if none applies.
- queries: 1 to 3 precise search queries in the question's language, one per distinct thing to find out (e.g. requirements and cost are two), naming the procedure or right with its official terms. No personal data.
- datasets: for each dataset, a short keyword query if it is needed to answer (laws, rulings, tax doctrine), otherwise null. Procedures usually need none.`;

const judge = (question: string, candidates: Candidate[]) => `Score how well each official source answers the citizen's question.
QUESTION: ${question}

SOURCES:
${candidates.map((candidate) => `[${candidate.id}] ${candidate.title} (${candidate.url})\n${clip(candidate.text, 600)}`).join("\n\n")}

For every source return its id and a score:
3 = directly answers the question (the specific procedure, requirement, cost or rule asked about)
2 = clearly about the same topic and useful to answer it
1 = same broad area but does not help answer this question
0 = unrelated
Score 3 only when the source's own procedure is the one the citizen asks about. A prerequisite, a related procedure, or one for a different group of people scores 2 at most.
A question that does not say which procedure, document, benefit or entity it is about cannot be answered by any source: score at most 1.`;

/** The judge's score per candidate id, or null when it did not answer in time. */
export async function scoreSources(question: string, candidates: Candidate[], fast: Resolved): Promise<Map<string, number> | null> {
  if (!candidates.length) return new Map();
  return generateText({
    model: fast.model,
    prompt: judge(question, candidates.slice(0, 24)),
    output: Output.object({ schema: z.object({ scores: z.array(z.object({ id: z.string(), score: z.number() })) }) }),
    temperature: 0,
    providerOptions: fast.providerOptions,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(deadlines.judge),
  })
    .then(({ output }) => new Map(output.scores.map((entry) => [entry.id, entry.score])))
    .catch(() => null);
}

export async function research({
  config,
  question,
  context,
  conversation,
  fast,
}: {
  config: ResearchConfig;
  question: string;
  context: ToolContext;
  conversation: string;
  fast: Resolved;
}): Promise<Research> {
  const timings: Record<string, number> = {};
  const started = Date.now();
  const mark = (name: string) => (timings[name] = Date.now() - started);
  /** The pages pinned on these authorities, read in full (cached a week, so usually instant). */
  const pinnedPages = async (domains: string[]): Promise<Candidate[]> => {
    const known = domains.flatMap((domain) => config.authorities.find((authority) => authority.domain === domain)?.pages ?? []);
    const read = await Promise.all(
      known.map(async (page) => {
        const result = await within(config.read.run({ url: page.url }, context), deadlines.read, null);
        const text = result && !("error" in result) ? (result.results as { text?: string }).text : undefined;
        return text ? [{ id: `p-${page.url}`, origin: "pinned", title: page.title, url: page.url, text: clip(text, 9000) ?? "", read: true, authority: true }] : [];
      }),
    );
    return read.flat();
  };

  const domains = config.authorities.map((authority) => authority.domain) as [string, ...string[]];
  const routeSchema = z.object({
    in_scope: z.boolean(),
    authorities: z.array(z.enum(domains)),
    queries: z.array(z.string()),
    datasets: z.object(Object.fromEntries(Object.keys(config.datasets).map((name) => [name, z.string().nullable()]))),
  });
  // The router, a broad web search and the corpus lookup all start together.
  const broad = within(config.web.run({ query: question }, context), deadlines.search, null);
  const routing: Promise<Route | null> = generateText({
    model: fast.model,
    prompt: plan(config, question, conversation),
    output: Output.object({ schema: routeSchema }),
    temperature: 0,
    providerOptions: fast.providerOptions,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(deadlines.route),
  })
    .then(({ output }) => ({
      inScope: output.in_scope,
      authorities: output.authorities.slice(0, 2),
      queries: output.queries.filter((query) => query.trim().length > 2).slice(0, 3),
      datasets: output.datasets as Record<string, string | null>,
    }))
    .catch(() => null);

  // A first question whose own words find a corpus record the judge confirms needs neither the router nor the web.
  // Lexical scores alone cannot tell: they grow with the corpus and reward shared filler words.
  if (!conversation) {
    const early = (await searchCorpus([question], [])).filter((hit) => hit.named);
    const answers = early.length ? answering(early, await scoreSources(question, asCandidates(early), fast)) : [];
    mark("corpus");
    if (answers.length) {
      const hosts = early.filter((hit) => answers.some((answer) => answer.id === hit.id)).map((hit) => hit.host);
      const domains = config.authorities.filter((authority) => hosts.some((host) => host && (host === authority.domain || host.endsWith(`.${authority.domain}`)))).map((authority) => authority.domain);
      return { route: null, candidates: [...answers, ...(await pinnedPages(domains))], considered: early.length, timings, corpus: true };
    }
  }

  const route = await routing;
  mark("route");
  if (route && !route.inScope) return { route, candidates: [], considered: 0, timings };

  const hits = await searchCorpus([...(route?.queries ?? []), question], route?.authorities ?? []);
  const records = asCandidates(hits);
  mark("corpus");

  const lead = route?.queries[0] || question;
  const scopedSearch = async (domain: string) => {
    const [strict, loose] = await Promise.all([
      within(config.web.run({ query: lead, site: domain }, context), deadlines.search, null).then((result) => collect(`site:${domain}`, result)),
      within(config.web.run({ query: `${lead} ${domain}` }, context), deadlines.search, null).then((result) => collect(`site:${domain}`, result)),
    ]);
    return [...strict, ...loose.filter((candidate) => under(candidate.url, domain))];
  };
  const pinned = pinnedPages(route?.authorities ?? []);
  const scoped = (route?.authorities ?? []).map(scopedSearch);
  const extra = (route?.queries.slice(1) ?? []).map((query) =>
    within(config.web.run({ query }, context), deadlines.search, null).then((result) => collect("web", result)),
  );
  const datasets = Object.entries(route?.datasets ?? {})
    .filter(([, query]) => query)
    .map(([name, query]) => within(config.datasets[name].tool.run({ query }, context), deadlines.dataset, null).then((result) => collect(name, result)));

  const gathered = (await Promise.all([broad.then((result) => collect("web", result)), ...scoped, ...extra, ...datasets, pinned])).flat();
  mark("search");

  const unique = [...new Map(gathered.map((candidate) => [candidate.url, candidate])).values()].map((candidate, index) => ({
    ...candidate,
    id: `s${index}`,
    authority: route?.authorities.some((domain) => under(candidate.url, domain)) ?? false,
  }));
  // Corpus records and web pages face the judge together; a record it scores as the answer answers alone,
  // the rest of them stay in the pool as ordinary evidence.
  const pool = [...records, ...unique];
  if (!pool.length) return { route, candidates: [], considered: 0, timings };

  const scores = await scoreSources(question, pool, fast);
  mark("judge");
  const answers = answering(hits, scores);
  // The entity's own pages ride along: they carry fees and dates newer than the register's record.
  if (answers.length) return { route, candidates: [...answers, ...unique.filter((candidate) => candidate.origin === "pinned")], considered: pool.length, timings, corpus: true };

  const relevant = pool
    .map((candidate) => ({ ...candidate, score: scores ? (scores.get(candidate.id) ?? 0) : candidate.authority ? keepScore : 1 }))
    .filter((candidate) => candidate.score >= keepScore)
    .sort((a, b) => b.score - a.score || Number(b.authority) - Number(a.authority))
    .slice(0, 6);

  return { route, candidates: relevant, considered: pool.length, timings };
}

export async function deepen(config: ResearchConfig, candidates: Candidate[], context: ToolContext) {
  const unread = candidates.filter((candidate) => !candidate.read);
  const pages = unread
    .filter((candidate) => candidate.origin === "web" || candidate.origin.startsWith("site:"))
    .sort((a, b) => Number(b.authority) - Number(a.authority) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2);
  const records = unread.filter((candidate) => candidate.ref && config.datasets[candidate.origin]?.reader).slice(0, 1);
  await Promise.all([
    ...pages.map(async (candidate) => {
      const result = await within(config.read.run({ url: candidate.url }, context), deadlines.read, null);
      const text = result && !("error" in result) ? (result.results as { text?: string }).text : undefined;
      if (text && text.length > candidate.text.length) Object.assign(candidate, { text: clip(text, 9000), read: true });
    }),
    ...records.map(async (candidate) => {
      const text = await within(config.datasets[candidate.origin].reader!(candidate, context), deadlines.read, null);
      if (text) Object.assign(candidate, { text: clip(text, 9000), read: true });
    }),
  ]);
  return pages.length + records.length > 0;
}

export function evidenceOf(candidates: Candidate[]) {
  const text = JSON.stringify(candidates.map(({ title, url, text, read, authority }) => ({ title, url, competent_entity: authority, full_page: !!read, text })));
  return text.length > maxEvidence ? text.slice(0, maxEvidence) : text;
}
