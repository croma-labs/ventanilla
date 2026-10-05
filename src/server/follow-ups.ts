import { createGroq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { z } from "zod";

const schema = z.object({ questions: z.array(z.string().min(6).max(120)).length(3) });

export async function suggestFollowUps(question: string, answer: string, language: string) {
  if (!process.env.GROQ_API_KEY || !answer.trim()) return [];
  try {
    const { output } = await generateText({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })(process.env.GROQ_FAST_MODEL ?? "openai/gpt-oss-20b"),
      output: Output.object({ schema }),
      providerOptions: { groq: { reasoningEffort: "low" } },
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(4000),
      system: `Write three short follow-up questions (under 70 characters each), in ${language}, first person, that the same person would naturally ask next. Each must be answerable from public government information. No personal data.`,
      prompt: `Question: ${question}\n\nAnswer: ${answer.slice(0, 3000)}`,
    });
    return output.questions;
  } catch {
    return [];
  }
}
