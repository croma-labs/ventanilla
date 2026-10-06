import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import sharp from "sharp";
import { fetchIcon, sniff } from "../src/server/icons.ts";

const country = process.env.COUNTRY ?? "co";
const root = new URL("../", import.meta.url);
const extensions: Record<string, string> = { "image/png": "png", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/svg+xml": "svg", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

const curl = promisify(execFile);
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

async function viaCurl(domain: string) {
  for (const host of [`www.${domain}`, domain]) {
    for (const path of ["/apple-touch-icon.png", "/favicon.ico", "/favicon.png"]) {
      const result = await curl("curl", ["-sfL", "-m", "15", "-A", userAgent, "-w", "\n%{content_type}", "-o", "-", `https://${host}${path}`], { encoding: "buffer", maxBuffer: 400_000 }).catch(() => null);
      if (!result) continue;
      const output = result.stdout as Buffer;
      const split = output.lastIndexOf(0x0a);
      const bytes = new Uint8Array(output.subarray(0, split));
      const type = sniff(bytes);
      if (type && bytes.length > 64 && bytes.length <= 200_000) return { bytes, type };
    }
  }
  return null;
}

const compact = (bytes: Uint8Array) =>
  sharp(bytes)
    .trim()
    .resize(128, 128, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toBuffer()
    .catch(() => null);

const source = await readFile(new URL(`src/countries/${country}/site.ts`, root), "utf8");
const block = source.slice(source.indexOf("entities:"), source.indexOf("officialSuffixes:"));
const domains = [...block.matchAll(/"([a-z0-9.-]+\.[a-z]{2,})":\s*\{([^}]*)\}/g)].filter(([, , body]) => !/\biconFrom\b/.test(body)).map(([, domain]) => domain);
const manifestUrl = new URL(`src/countries/${country}/icons.json`, root);
const manifest: Record<string, string> = JSON.parse(await readFile(manifestUrl, "utf8").catch(() => "{}"));
const only = process.argv.slice(2);

await mkdir(new URL(`public/icons/${country}/`, root), { recursive: true });
const failed: string[] = [];
for (const domain of only.length ? only : domains.filter((domain) => !manifest[domain])) {
  const icon = (await fetchIcon(domain, 12_000)) ?? (await viaCurl(domain));
  if (!icon) {
    failed.push(domain);
    continue;
  }
  const optimized = icon.type === "image/x-icon" || icon.type === "image/vnd.microsoft.icon" ? null : await compact(icon.bytes);
  const path = `/icons/${country}/${domain}.${optimized ? "webp" : (extensions[icon.type] ?? "png")}`;
  await writeFile(new URL(`public${path}`, root), optimized ?? icon.bytes);
  manifest[domain] = path;
  console.log(`ok   ${domain} -> ${path}`);
}
await writeFile(manifestUrl, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
if (failed.length) console.log(`missing (blocked or no icon): ${failed.join(" ")}`);
