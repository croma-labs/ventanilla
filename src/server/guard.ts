import { hmac, safeEqual } from "./crypto";
import { store } from "./store";

const windows = [
  { name: "m", seconds: 60, limit: Number(process.env.LIMIT_PER_MINUTE ?? 6) },
  { name: "d", seconds: 86_400, limit: Number(process.env.LIMIT_PER_DAY ?? 80) },
] as const;

export async function anonymousKey(address: string) {
  const day = new Date().toISOString().slice(0, 10);
  return (await hmac(`client:${day}:${address}`)).slice(0, 32);
}

export async function admit(key: string) {
  for (const window of windows) {
    const bucket = Math.floor(Date.now() / 1000 / window.seconds);
    try {
      const count = await store.incr(`rl:${window.name}:${bucket}:${key}`, window.seconds);
      if (count > window.limit) return { ok: false as const, retryAfter: window.seconds - (Math.floor(Date.now() / 1000) % window.seconds) };
    } catch {
      return { ok: true as const };
    }
  }
  return { ok: true as const };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site)) return false;
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const signAnswer = async (text: string) => (await hmac(`answer:${text}`)).slice(0, 40);

export const verifyAnswer = async (text: string, signature: unknown) => typeof signature === "string" && safeEqual(await signAnswer(text), signature);
