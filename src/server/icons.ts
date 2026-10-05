export type Icon = { bytes: Uint8Array; type: string };

const maxBytes = 200_000;
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const domainPattern = /^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/;

export function sniff(bytes: Uint8Array) {
  const head = (length: number) => [...bytes.subarray(0, length)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (head(4) === "89504e47") return "image/png";
  if (head(4) === "00000100") return "image/x-icon";
  if (head(3) === "ffd8ff") return "image/jpeg";
  if (head(4) === "47494638") return "image/gif";
  if (head(4) === "52494646" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  const text = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart().toLowerCase();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/.test(text)) return "image/svg+xml";
  return null;
}

const score = (rel: string, sizes: string, href: string) => {
  const size = Math.max(0, ...(sizes.match(/\d+/g) ?? []).map(Number));
  if (/apple-touch-icon/i.test(rel)) return 300 + size;
  if (/\.svg(\?|$)/i.test(href)) return 250;
  return 100 + Math.min(size, 256);
};

async function get(url: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "text/html,image/*;q=0.9,*/*;q=0.5" }, redirect: "follow", signal });
  if (!response.ok || !response.url.startsWith("https://")) return null;
  return response;
}

async function candidates(origin: string, signal: AbortSignal) {
  const page = await get(origin, signal).catch(() => null);
  const html = page ? (await page.text()).slice(0, 300_000) : "";
  const base = page?.url ?? origin;
  const links = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({
      rel: tag.match(/\brel=["']?([^"'>]+)/i)?.[1] ?? "",
      href: tag.match(/\bhref=["']?([^"'\s>]+)/i)?.[1] ?? "",
      sizes: tag.match(/\bsizes=["']?([^"'>]+)/i)?.[1] ?? "",
    }))
    .filter((link) => /icon/i.test(link.rel) && link.href && !link.href.startsWith("data:"))
    .sort((a, b) => score(b.rel, b.sizes, b.href) - score(a.rel, a.sizes, a.href))
    .map((link) => new URL(link.href, base).href);
  return [...new Set([...links, new URL("/apple-touch-icon.png", base).href, new URL("/favicon.ico", base).href])].filter((url) => url.startsWith("https://"));
}

export async function fetchIcon(domain: string, timeoutMs = 8000): Promise<Icon | null> {
  if (!domainPattern.test(domain)) return null;
  const signal = AbortSignal.timeout(timeoutMs);
  for (const origin of [`https://${domain}/`, `https://www.${domain}/`]) {
    for (const url of (await candidates(origin, signal).catch(() => [])).slice(0, 5)) {
      const response = await get(url, signal).catch(() => null);
      if (!response) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      const type = sniff(bytes);
      if (!type) continue;
      if (bytes.length <= 64 || bytes.length > maxBytes) continue;
      if (type === "image/svg+xml" && /<script|\bon\w+\s*=|<foreignObject|javascript:/i.test(new TextDecoder().decode(bytes))) continue;
      return { bytes, type };
    }
  }
  return null;
}
