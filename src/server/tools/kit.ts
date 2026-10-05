import { tool, type Tool } from "ai";
import { z } from "zod";
import { croma, CromaError, type Quota } from "../croma";

export type Source = { title: string; url: string };

export type ToolContext = {
  signal: AbortSignal;
  official: (url: string) => boolean;
  trace: { name: string; ms: number; cached: boolean; ok: boolean; code?: string }[];
  prefetched?: Record<string, Promise<ToolResult>>;
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
  build: (context: ToolContext) => Tool;
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
    build: (context) => tool({ description: definition.description, inputSchema: definition.input, execute: (input: z.infer<Input>) => run(input, context) }),
  };
}

const slow = { error: "Esta fuente tardó demasiado; responde con las demás y sugiere consultar la entidad." };

const within = <T>(promise: Promise<T>, ms: number, fallback: T) =>
  Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

const deadlines = { source: Number(process.env.SOURCE_DEADLINE_MS ?? 8000), prefetched: Number(process.env.PREFETCH_DEADLINE_MS ?? 15000) };

export function fanOut(description: string, parts: Record<string, SourceTool>) {
  const input = z.object(Object.fromEntries(Object.entries(parts).map(([key, part]) => [key, part.input.nullish().describe(part.description)])));
  return (context: ToolContext): Tool =>
    tool({
      description,
      inputSchema: input,
      execute: async (request: Record<string, unknown>) => {
        const guard = (promise: Promise<ToolResult>, ms: number) => within<ToolResult>(promise.catch(() => slow), ms, slow);
        const tasks = [
          ...Object.entries(context.prefetched ?? {}).map(([key, promise]) => [key, guard(promise, deadlines.prefetched)] as const),
          ...Object.entries(parts)
            .filter(([key]) => request[key])
            .map(([key, part]) => [key, guard(part.run(request[key], context), deadlines.source)] as const),
        ];
        const settled = await Promise.all(tasks.map(async ([key, task]) => [key, await task] as const));
        return {
          results: settled.reduce<Record<string, unknown[]>>((all, [key, result]) => ({ ...all, [key]: [...(all[key] ?? []), "error" in result ? result : result.results] }), {}),
          sources: settled.flatMap(([, result]) => ("sources" in result ? result.sources : [])),
        };
      },
    });
}
