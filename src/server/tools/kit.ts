import { z } from "zod";
import { croma, CromaError, type Quota } from "../croma";

export type Source = { title: string; url: string };

export type ToolContext = {
  signal: AbortSignal;
  official: (url: string) => boolean;
  trace: { name: string; ms: number; cached: boolean; ok: boolean; code?: string }[];
};

export type ToolResult = { results: unknown; sources: Source[] } | { error: string };

type Definition<Input extends z.ZodType, Data> = {
  description: string;
  input: Input;
  path: string;
  ttl: number;
  quota?: Quota;
  body: (input: z.infer<Input>, context: ToolContext) => Record<string, unknown> | null;
  shape: (data: Data, context: ToolContext) => { results: unknown; sources: Source[] };
  cacheKey?: (body: Record<string, unknown>) => string;
  cacheable?: (data: Data) => boolean;
  refused?: string;
};

const messages: Record<string, string> = {
  quota_exhausted: "Esta fuente alcanzó su cuota por ahora. Responde con las demás fuentes y avisa que el dato puede requerir verificación.",
  not_found: "La fuente no tiene información para esa consulta.",
};

export const clip = (text: unknown, max: number) => {
  if (typeof text !== "string") return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

const withoutNulls = (input: Record<string, unknown>) => Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ""));

export type SourceTool<Input extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: Input;
  run: (input: z.infer<Input>, context: ToolContext) => Promise<ToolResult>;
};

export function cromaTool<Input extends z.ZodType, Data>(name: string, definition: Definition<Input, Data>): SourceTool<Input> {
  const run = async (input: z.infer<Input>, context: ToolContext): Promise<ToolResult> => {
    const started = Date.now();
    const body = definition.body(input, context);
    if (!body) return { error: definition.refused ?? "Consulta no permitida." };
    try {
      const clean = withoutNulls(body);
      const { data, cached } = await croma<Data>(definition.path, clean, { ttl: definition.ttl, signal: context.signal, quota: definition.quota, cacheKey: definition.cacheKey?.(clean), cacheable: definition.cacheable as ((data: unknown) => boolean) | undefined });
      context.trace.push({ name, ms: Date.now() - started, cached, ok: true });
      return definition.shape(data, context);
    } catch (error) {
      const code = error instanceof CromaError ? `${error.status}:${error.code}` : error instanceof Error ? `${error.name}:${error.message.slice(0, 80)}` : "unknown";
      context.trace.push({ name, ms: Date.now() - started, cached: false, ok: false, code });
      if (context.signal.aborted) throw error;
      const known = error instanceof CromaError ? messages[error.code] : undefined;
      return { error: known ?? (error instanceof CromaError && error.status === 404 ? messages.not_found : "La fuente no respondió. Usa las demás fuentes.") };
    }
  };
  return {
    name,
    description: definition.description,
    input: definition.input,
    run,
  };
}
