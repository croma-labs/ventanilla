import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

for (const [key, value] of Object.entries(loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""))) process.env[key] ??= value;

const country = process.env.COUNTRY ?? "co";
const corpus = [".corpus/fichas.jsonl", ".corpus/index.json", ".corpus/manifest.json"].filter((file) => existsSync(file));
const photos = [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }];

/** /turismo exists only where there is a tourism directory to show. */
const turismo = {
  name: "turismo",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      if (country !== "sv") return;
      const routes = {
        "/turismo": "index.astro",
        "/turismo/explorar": "explorar.astro",
        "/turismo/eventos": "eventos.astro",
        "/turismo/guias": "guias.astro",
        "/turismo/lugar/[slug]": "lugar.astro",
        "/turismo/departamento/[slug]": "departamento.astro",
        "/turismo/indice.json": "indice.json.ts",
      };
      for (const [pattern, file] of Object.entries(routes)) injectRoute({ pattern, entrypoint: `./src/turismo/${file}` });
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
