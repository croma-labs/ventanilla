import { createGroq } from "@ai-sdk/groq";
import { generateText, Output, streamText, type LanguageModel } from "ai";
import { z } from "zod";

const maxEvidence = 28_000;
const maxClaims = 12;
const snippetRadius = 90;

export function evidenceText(outputs: unknown[]) {
  const text = outputs.map((output) => JSON.stringify(output)).join("\n");
  return text.length > maxEvidence ? text.slice(0, maxEvidence) : text;
}

const plain = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const unsafe = /\\\d|\(\?<?[=!]|\([^)]*[+*}][^)]*\)\s*[+*{]/;

function compile(pattern: string) {
  if (pattern.length > 80 || unsafe.test(pattern)) return null;
  try {
    return new RegExp(pattern.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ +/g, "\\s+"), "gi");
  } catch {
    return null;
  }
}

const windowSize = 800;

type Claim = { claim: string; terms: string[] };

export type Check = { claim: string; terms: string[]; status: "found" | "scattered" | "not_found" | "invalid_pattern"; snippet?: string; missing?: string[] };

export function checkClaims(evidence: string, claims: Claim[]): Check[] {
  const haystack = plain(evidence);
  return claims.slice(0, maxClaims).map(({ claim, terms }) => {
    const compiled = terms.slice(0, 4).map((term) => [term, compile(term)] as const);
    if (!compiled.length || compiled.some(([, regex]) => !regex)) return { claim, terms, status: "invalid_pattern" };
    const positions = compiled.map(([term, regex]) => [term, [...haystack.matchAll(regex!)].map((match) => match.index ?? 0)] as const);
    const missing = positions.filter(([, found]) => !found.length).map(([term]) => term);
    if (missing.length) return { claim, terms, status: "not_found", missing };
    const [, anchors] = positions[0];
    const anchor = anchors.find((at) => positions.every(([, found]) => found.some((other) => Math.abs(other - at) <= windowSize)));
    if (anchor === undefined) return { claim, terms, status: "scattered" };
    const start = Math.max(0, anchor - snippetRadius);
    return { claim, terms, status: "found", snippet: haystack.slice(start, anchor + snippetRadius * 2) };
  });
}

const verifyInstructions = `You are the fact-checker of a public-services assistant. You receive EVIDENCE (raw results from official government sources) and a DRAFT answer.
List every checkable claim in the DRAFT: requirements, steps, costs, amounts, dates, deadlines, percentages, norm or ruling numbers, entity and office names, and every URL.
For each claim give 2 to 4 short key terms as JavaScript regular expressions: the facts that must appear together in the official text for the claim to be true (numbers, amounts, named things, the key noun). Do not copy the draft's phrasing.
Examples: "1.300 semanas" -> ["1[.,]?300", "semanas"]; "57 años mujeres, 62 hombres" -> ["57", "mujer", "62", "hombre"]; "costo $67.350" -> ["67[.,]?350"]; "Ley 1266 de 2008" -> ["1266", "2008"]; a URL -> [a distinctive path fragment].
Matching ignores case and accents. Keep each term under 40 characters: no lookarounds, no backreferences, no nested quantifiers.`;

const retryInstructions = `You are the fact-checker of a public-services assistant. These claims were not matched in the EVIDENCE with the key terms tried (see "missing"). For each, give alternative key terms that the EVIDENCE would use for the same fact: synonyms, other number formats ("1300", "1.300"), abbreviations, singular or plural. Copy each claim text exactly as given. Matching ignores case and accents. 2 to 4 short terms per claim.`;

const claimsSchema = z.object({ claims: z.array(z.object({ claim: z.string(), terms: z.array(z.string()) })) });

const writeInstructions = (language: string) => `You are the fact-checker of a public-services assistant. Write the final answer to the QUESTION, in ${language}, in the DRAFT's Markdown format, using the CHECKS (one per claim: found = its key facts appear together in an official source, with the snippet; scattered = the terms appear but not together, treat as weak; not_found = a key fact is missing; invalid_pattern = not checked) and the EVIDENCE:
- Keep a claim only if a check found it or it plainly appears in the EVIDENCE. Remove or correct everything else. Never add facts that are not in the EVIDENCE.
- Keep only Markdown links whose URL appears in the EVIDENCE. Turn any other link into plain text. Never print bare URLs.
- Link an entity or office name only to that entity's own website from the EVIDENCE; never link an entity name to a norm or a document about something else.
- The visible text of every link must name the exact document at that URL, using its title from the EVIDENCE (e.g. "[Concepto 554581 de 2024 de Función Pública](url)"). If a norm is only explained by another document, say so: "la Ley 2114 de 2021, según el [Concepto 554581 de 2024](url)".
- Every section with data must link at least one supporting URL from the EVIDENCE.
- If the EVIDENCE does not answer the QUESTION, say plainly that you could not confirm it in official sources right now and name the competent entity, linking its page only if it is in the EVIDENCE.
- Do not add a separate list or section of sources; the interface shows them in a chip below the answer.
- Style: first line is the direct answer in one plain sentence (no bold lead). Then at most one or two short ### sections with one-line bullets. Put links inline on the key noun ("pide el [duplicado en línea](url)"). Bold at most one or two critical words. If there is something the assistant cannot do for the person, say it in one sentence and link where to do it. 60 to 160 words. No closing offers or questions.
- Never mention the evidence, the draft, the checks or this review. No preamble, no horizontal rules. Keep the draft's tone.`;

type Options = {
  model: LanguageModel;
  providerOptions?: Parameters<typeof generateText>[0]["providerOptions"];
  question: string;
  draft: string;
  evidence: string;
  language: string;
};

export async function verify({ model, providerOptions, question, draft, evidence }: Omit<Options, "language">) {
  if (!evidence) return [];
  const fast = process.env.GROQ_API_KEY ? createGroq({ apiKey: process.env.GROQ_API_KEY })(process.env.GROQ_FAST_MODEL ?? "openai/gpt-oss-20b") : null;
  const ask = async (system: string, prompt: string) => {
    try {
      const { output } = await generateText({
        model: fast ?? model,
        system,
        prompt,
        output: Output.object({ schema: claimsSchema }),
        temperature: 0,
        providerOptions: fast ? { groq: { reasoningEffort: "low", structuredOutputs: true, strictJsonSchema: true } } : providerOptions,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(12_000),
      });
      return output.claims;
    } catch (error) {
      console.error("[ventanilla] verify failed", error instanceof Error ? error.message.slice(0, 200) : error);
      return [];
    }
  };

  const first = checkClaims(evidence, await ask(verifyInstructions, context(question, evidence, draft)));
  const missing = first.filter((check) => check.status !== "found");
  if (!missing.length) return first;
  const retried = checkClaims(
    evidence,
    await ask(retryInstructions, `EVIDENCE:\n${evidence}\n\nUNMATCHED:\n${JSON.stringify(missing.map(({ claim, terms, missing }) => ({ claim, terms, missing })))}`),
  );
  const recovered = new Map(retried.filter((check) => check.status === "found").map((check) => [check.claim, check]));
  return first.map((check) => recovered.get(check.claim) ?? check);
}

export function rewrite({ model, providerOptions, question, draft, evidence, language, checks, signal }: Options & { checks: Check[]; signal: AbortSignal }) {
  return streamText({
    model,
    system: writeInstructions(language),
    prompt: `${context(question, evidence, draft)}\n\nCHECKS:\n${checks.length ? JSON.stringify(checks) : "(no checks ran: keep only what plainly appears in the EVIDENCE)"}`,
    temperature: 0,
    providerOptions,
    maxRetries: 1,
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
  });
}

const context = (question: string, evidence: string, draft: string) =>
  `QUESTION:\n${question}\n\nEVIDENCE:\n${evidence || "(no official source answered)"}\n\nDRAFT:\n${draft}`;
