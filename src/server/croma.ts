import { sha256, stableJson } from "./crypto";
import { store } from "./store";

const base = process.env.CROMA_API_URL ?? "https://api.croma.run";
const inlineWaitSeconds = 20;
const deadlineMs = 30_000;

export type Quota = "web" | "extract";

export class CromaError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`croma ${status} ${code}`);
  }
}

type Options = { ttl: number; signal?: AbortSignal; quota?: Quota; cacheKey?: string; cacheable?: (data: unknown) => boolean };

type Job = { job?: { status?: string; status_url?: string }; data?: unknown; error?: { code?: string } };

const inflight = new Map<string, Promise<unknown>>();

export const pendingWork = () => [...inflight.values()];

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });

const quiet = async <T>(promise: Promise<T>) => {
  try {
    return await promise;
  } catch {
    return null;
  }
};

const blockedKey = (quota: Quota) => `quota:${quota}`;

async function rememberQuota(quota: Quota | undefined, response: Response) {
  if (!quota) return;
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = Date.parse(response.headers.get("x-ratelimit-reset") ?? "");
  const retryAfter = Number(response.headers.get("retry-after"));
  const until = response.status === 429 ? Date.now() + (retryAfter > 0 ? retryAfter * 1000 : 60_000) : remaining === "0" && reset ? reset : 0;
  if (until > Date.now()) await quiet(store.set(blockedKey(quota), until, Math.ceil((until - Date.now()) / 1000)));
}

async function request(path: string, body: unknown, idempotencyKey: string, quota: Quota | undefined, signal: AbortSignal) {
  const apiKey = process.env.CROMA_API_KEY;
  if (!apiKey) throw new CromaError(500, "missing_api_key");
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" };
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...headers, Prefer: `wait=${inlineWaitSeconds}`, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    signal,
  });
  await rememberQuota(quota, response);
  if (response.status === 200) return ((await response.json()) as Job).data;
  if (response.status !== 202) {
    const failure = (await quiet(response.json() as Promise<Job>))?.error?.code ?? "upstream_error";
    throw new CromaError(response.status, failure);
  }
  let job = (await response.json()) as Job;
  const statusUrl = job.job?.status_url ?? response.headers.get("location");
  if (!statusUrl || new URL(statusUrl, base).origin !== new URL(base).origin) throw new CromaError(502, "missing_status_url");
  let wait = Number(response.headers.get("retry-after")) || 2;
  for (;;) {
    await sleep(wait * 1000, signal);
    const poll = await fetch(new URL(statusUrl, base), { headers, signal });
    job = (await poll.json()) as Job;
    const status = job.job?.status;
    if (status === "completed") return job.data;
    if (status && ["failed", "canceled", "expired"].includes(status)) throw new CromaError(502, job.error?.code ?? status);
    wait = Number(poll.headers.get("retry-after")) || 2;
  }
}

export async function croma<T>(path: string, body: Record<string, unknown>, { ttl, signal, quota, cacheKey, cacheable }: Options): Promise<{ data: T; cached: boolean }> {
  const key = `croma:${await sha256(path + (cacheKey ?? stableJson(body)))}`;
  const hit = await quiet(store.get<T>(key));
  if (hit !== null && hit !== undefined) return { data: hit, cached: true };
  if (quota && ((await quiet(store.get<number>(blockedKey(quota)))) ?? 0) > Date.now()) throw new CromaError(429, "quota_exhausted");

  const shared = inflight.get(key);
  if (shared) return { data: (await abortable(shared, signal)) as T, cached: true };

  const deadline = AbortSignal.timeout(deadlineMs);
  const attempt = () => request(path, body, key.slice(6, 70), quota, deadline);
  const work = attempt()
    .catch((error) => (error instanceof TypeError && !deadline.aborted ? sleep(300, deadline).then(attempt) : Promise.reject(error)))
    .then(async (data) => {
      if (data !== undefined && data !== null && (cacheable?.(data) ?? true)) await quiet(store.set(key, data, ttl));
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, work);
  return { data: (await abortable(work, signal)) as T, cached: false };
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return Promise.race([promise, new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))]);
}
