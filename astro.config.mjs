import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

for (const [key, value] of Object.entries(loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), ""))) process.env[key] ??= value;

const country = process.env.COUNTRY ?? "co";

export default defineConfig({
  output: "static",
  adapter: vercel(),
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@country": fileURLToPath(new URL(`./src/countries/${country}`, import.meta.url)) } },
  },
});
