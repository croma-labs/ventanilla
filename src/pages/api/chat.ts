import { assistant } from "@country/assistant";
import { site } from "@country/site";
import type { APIRoute } from "astro";
import { stepCountIs, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { scrub } from "../../lib/pii";
import type { Grounding, UiChunk } from "../../lib/ui-stream";
import { admit, anonymousKey, sameOrigin, signAnswer, verifyAnswer } from "../../server/guard";
import { recall, remember } from "../../server/answers";
import { evidenceText, rewrite, verify } from "../../server/review";
import { suggestFollowUps } from "../../server/follow-ups";
import { resolveModel } from "../../server/model";
import type { Source, ToolContext } from "../../server/tools/kit";

export const prerender = false;

const maxBodyBytes = 24_000;
const maxSources = 6;
const maxSteps = 3;

const turn = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), text: z.string().trim().min(1).max(2000) }),
  z.object({ role: z.literal("assistant"), text: z.string().max(6000), signature: z.string().max(64).optional() }),
]);

const payload = z.object({ messages: z.array(turn).min(1).max(16) });

const reply = (status: number, error: string, headers: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });

const official = (url: string) => {
  try {
    const host = new URL(url).hostname;
    return site.officialSuffixes.some((suffix) => (suffix.startsWith(".") ? host.endsWith(suffix) : host === suffix || host.endsWith(`.${suffix}`)));
  } catch {
    return false;
  }
};

async function toModelMessages(turns: z.infer<typeof payload>["messages"]) {
  const messages: ModelMessage[] = [];
  for (const entry of turns.slice(-10)) {
    if (entry.role === "user") messages.push({ role: "user", content: scrub(entry.text, site.pii).text });
    else if (await verifyAnswer(entry.text, entry.signature)) messages.push({ role: "assistant", content: entry.text.slice(0, 2500) });
  }
  return messages.at(-1)?.role === "user" ? messages : null;
}

function rankSources(sources: Map<string, Source>, answer: string, live = false): Grounding[] {
  const all = [...sources.values()].filter((source) => official(source.url));
  const cited = all.filter((source) => answer.includes(source.url));
  const rest = all.filter((source) => !cited.includes(source));

  return [...cited, ...(live ? rest.slice(0, 3) : [])]
    .slice(0, maxSources)
    .map((source) => ({ title: source.title, url: source.url, currency: "verified" }));
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const started = Date.now();
  if (!sameOrigin(request)) return reply(403, "forbidden");
  if (!request.headers.get("content-type")?.includes("application/json")) return reply(415, "unsupported_media_type");
  const raw = await request.text();
  if (raw.length > maxBodyBytes) return reply(413, "too_large");

  const parsed = payload.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed.success) return reply(400, "invalid_request");

  const gate = await admit(await anonymousKey(clientAddress ?? "unknown"));
  if (!gate.ok) return reply(429, "rate_limited", { "Retry-After": String(gate.retryAfter) });

  const resolved = resolveModel();
  if (!resolved) return reply(503, "no_model");

  const messages = await toModelMessages(parsed.data.messages);
  if (!messages) return reply(400, "invalid_request");

  const encoder = new TextEncoder();
  const signal = request.signal;
  const context: ToolContext = { signal, official, trace: [] };
  const tools = Object.fromEntries(Object.entries(assistant.tools).map(([name, build]) => [name, build(context)]));

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: UiChunk) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        } catch {}
      };
      const searchId = `search-${crypto.randomUUID().slice(0, 8)}`;
      const textId = `txt-${crypto.randomUUID().slice(0, 8)}`;
      const sources = new Map<string, Source>();
      let answer = "";
      let open = false;
      let pendingTools = 0;
      let firstText = 0;
      let outcome = "ok";
      const steps: { ms: number; tokens?: number; reasoning?: number }[] = [];
      const evidence: unknown[] = [];
      let draft = "";
      let checked: { ms: number; claims: number; unsupported: number; changed: boolean } | undefined;

      const write = (delta: string | undefined) => {
        if (!delta) return;
        if (!open) {
          send({ type: "text-start", id: textId });
          open = true;
          firstText = Date.now() - started;
        }
        answer += delta;
        send({ type: "text-delta", id: textId, delta });
      };
      const searchUpdate = (status: "searching" | "done") =>
        send({ type: "data-search", id: searchId, data: { status, resultCount: sources.size, groundings: rankSources(sources, "", true) } });

      send({ type: "start", messageId: `msg_${crypto.randomUUID()}` });
      send({ type: "start-step" });

      const question = String(messages.at(-1)?.content ?? "");
      const firstTurn = messages.length === 1;
      const conversational = assistant.smallTalk.test(question.trim());
      const cached = firstTurn ? await recall(question) : null;
      let followUps: string[] = [];

      if (cached) {
        outcome = "cached";
        cached.groundings.forEach((grounding) => sources.set(grounding.url, grounding));
        searchUpdate("done");
        write(cached.answer);
        followUps = cached.followUps;
      } else {
        if (!conversational) {
          const previous = firstTurn ? "" : String(messages.findLast((message, index) => message.role === "user" && index < messages.length - 1)?.content ?? "");
          const query = `${previous.slice(0, 80)} ${question}`.trim().slice(0, 200);
          if (query.length >= 3) context.prefetched = Object.fromEntries(Object.entries(assistant.prefetch).map(([key, source]) => [key, source.run({ query }, context)]));
        }
        try {
          const result = streamText({
            model: resolved.model,
            system: assistant.instructions(new Intl.DateTimeFormat(site.locale, { dateStyle: "full", timeZone: "America/Bogota" }).format(new Date())),
            messages,
            tools,
            stopWhen: stepCountIs(maxSteps),
            prepareStep: ({ stepNumber }) =>
              stepNumber >= maxSteps - 1 ? { toolChoice: "none" as const } : stepNumber === 0 && !conversational ? { toolChoice: "required" as const } : {},
            maxRetries: 1,
            temperature: 0.2,
            abortSignal: signal,
            providerOptions: resolved.providerOptions,
            onStepFinish: (step) => void steps.push({ ms: Date.now() - started, tokens: step.usage.outputTokens, reasoning: step.usage.outputTokenDetails?.reasoningTokens }),
          });
          for await (const part of result.stream) {
            if (part.type === "tool-call") {
              pendingTools++;
              searchUpdate("searching");
            } else if (part.type === "tool-result" || part.type === "tool-error") {
              pendingTools = Math.max(0, pendingTools - 1);
              const output = part.type === "tool-result" ? (part.output as { results?: unknown; sources?: Source[] }) : null;
              output?.sources?.forEach((source) => sources.set(source.url, source));
              if (output) evidence.push(output);
              searchUpdate(pendingTools ? "searching" : "done");
            } else if (part.type === "text-delta") {
              if (conversational) write(part.text);
              else draft += part.text;
            } else if (part.type === "error") {
              throw part.error;
            }
          }
          if (!conversational) {
            if (!draft.trim()) throw new Error("empty_draft");
            const reviewStarted = Date.now();
            const sourceText = evidenceText(evidence);
            const review = { model: resolved.model, providerOptions: resolved.providerOptions, question, draft, evidence: sourceText, language: site.locale };
            const checks = await verify(review);
            checked = { ms: Date.now() - reviewStarted, claims: checks.length, unsupported: checks.filter((check) => check.status !== "found").length, changed: false };
            for await (const delta of rewrite({ ...review, checks, signal }).textStream) write(delta.replace(/<\/?(?:tool_call|function|parameter)[^>]*>/g, ""));
            checked.ms = Date.now() - reviewStarted;
            checked.changed = answer.trim() !== draft.trim();
          }
          if (!answer.trim()) throw new Error("empty_answer");
        } catch (error) {
          outcome = signal.aborted ? "aborted" : "error";
          if (!signal.aborted) console.error("[ventanilla] chat failed", error instanceof Error ? error.message.slice(0, 120) : "unknown");
          if (!answer) write(site.ui.unavailable);
        }
      }

      if (open) send({ type: "text-end", id: textId });
      if (sources.size) send({ type: "data-search", id: searchId, data: { status: "done", resultCount: sources.size, groundings: rankSources(sources, answer) } });
      else if (!conversational) send({ type: "data-search", id: searchId, data: { status: "done", resultCount: 0, groundings: [] } });
      send({ type: "finish-step" });
      send({ type: "message-metadata", messageMetadata: { answerComplete: true } });
      if (outcome === "ok" && sources.size) {
        followUps = await suggestFollowUps(question, answer, site.lang);
        if (firstTurn && !conversational && checked && checked.claims > 0 && checked.unsupported < checked.claims) await remember(question, { answer, groundings: rankSources(sources, answer), followUps });
      }
      const grounded = rankSources(sources, answer);
      const metadata = { answerComplete: true, followUpSuggestions: followUps, signature: await signAnswer(answer), verified: grounded.length > 0, conversational };
      send({ type: "finish", finishReason: outcome === "error" || outcome === "aborted" ? "error" : "stop", messageMetadata: metadata });
      try {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {}
      console.info(
        JSON.stringify({ event: "chat", outcome, model: resolved.id, ms: Date.now() - started, firstTextMs: firstText, sources: sources.size, steps, review: checked, tools: context.trace }),
      );
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
};

export const ALL: APIRoute = () => reply(405, "method_not_allowed", { Allow: "POST" });
