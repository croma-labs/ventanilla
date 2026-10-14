import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { ROUTES } from "./src/lib/turismo/labels.ts";

for (const [key, value] of Object.entries(loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""))) process.env[key] ??= value;

const country = process.env.COUNTRY ?? "co";
const corpus = [".corpus/fichas.jsonl", ".corpus/index.json", ".corpus/manifest.json"].filter((file) => existsSync(file));
const photos = [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }];

/** The tourism guide, in every language it speaks, exists only where there is a tourism directory to show. */
const turismo = {
  name: "turismo",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      if (country !== "sv") return;
      const shared = { "/turismo/indice.json": "indice.json.ts", "/turismo/ficha/[slug].json": "ficha.json.ts", "/turismo/agenda.json": "agenda.json.ts" };
      for (const { pattern, page } of ROUTES) injectRoute({ pattern, entrypoint: `./src/turismo/${page}` });
      for (const [pattern, file] of Object.entries(shared)) injectRoute({ pattern, entrypoint: `./src/turismo/${file}` });
    },
  },
};

export default defineConfig({
  site: process.env.SITE_URL ?? "https://gov.usecroma.com",
  output: "static",
  adapter: vercel({ includeFiles: corpus, imageService: true }),
  image: { remotePatterns: photos },
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "always" },
  security: { checkOrigin: true },
  integrations: [react(), turismo],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@country": fileURLToPath(new URL(`./src/countries/${country}`, import.meta.url)) } },
  },
});
