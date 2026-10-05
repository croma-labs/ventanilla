const encoder = new TextEncoder();

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const secret = process.env.VENTANILLA_SECRET ?? crypto.randomUUID() + crypto.randomUUID();

if (!process.env.VENTANILLA_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[ventanilla] VENTANILLA_SECRET is not set; signatures and client keys reset on every cold start");
}

const key = crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

export const hmac = async (message: string) => hex(await crypto.subtle.sign("HMAC", await key, encoder.encode(message)));

export const sha256 = async (message: string) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(message)));

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export const stableJson = (value: unknown): string =>
  value && typeof value === "object" && !Array.isArray(value)
    ? `{${Object.keys(value)
        .sort()
        .map((name) => `${JSON.stringify(name)}:${stableJson((value as Record<string, unknown>)[name])}`)
        .join(",")}}`
    : JSON.stringify(value);
