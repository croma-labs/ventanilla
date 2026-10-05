import { anthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

export type Resolved = { model: LanguageModel; id: string; providerOptions: Record<string, Record<string, string | boolean>> };

export function resolveModel(): Resolved | null {
  const preferred = process.env.AI_PROVIDER;
  if (process.env.GROQ_API_KEY && preferred !== "anthropic") {
    const id = process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";
    return {
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })(id),
      id,
      providerOptions: { groq: { reasoningEffort: process.env.GROQ_REASONING ?? (id.startsWith("openai/") ? "low" : "none"), parallelToolCalls: true } },
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const id = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
    return { model: anthropic(id), id, providerOptions: {} };
  }
  return null;
}

export function resolveFastModel(fallback: Resolved): Resolved {
  if (!process.env.GROQ_API_KEY) return fallback;
  const id = process.env.GROQ_FAST_MODEL ?? "openai/gpt-oss-20b";
  return {
    model: createGroq({ apiKey: process.env.GROQ_API_KEY })(id),
    id,
    providerOptions: { groq: { reasoningEffort: process.env.FAST_REASONING ?? "medium", structuredOutputs: true, strictJsonSchema: true } },
  };
}
