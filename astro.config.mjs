import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { corpusFiles } from "./src/server/corpus-index.ts";

for (const [key, value] of Object.entries(loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""))) process.env[key] ??= value;

const country = process.env.COUNTRY ?? "co";
const corpus = Object.values(corpusFiles).filter((file) => existsSync(file));

export default defineConfig({
  site: process.env.SITE_URL ?? "https://gov.usecroma.com",
  output: "static",
  adapter: vercel({ includeFiles: corpus }),
  devToolbar: { enabled: false },
  build: { inlineStylesheets: "always" },
  security: { checkOrigin: true },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@country": fileURLToPath(new URL(`./src/countries/${country}`, import.meta.url)) } },
  },
});
