import { readFile } from "node:fs/promises";
import { site } from "@country/site";
import type { APIRoute, GetStaticPaths } from "astro";

const types: Record<string, string> = { "favicon.svg": "image/svg+xml", "favicon.ico": "image/x-icon", "apple-touch-icon.png": "image/png", "og.jpg": "image/jpeg" };

export const getStaticPaths = (() => Object.keys(types).map((asset) => ({ params: { asset } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const asset = String(params.asset);
  return new Response(await readFile(`src/countries/${site.code}/brand/${asset}`), { headers: { "Content-Type": types[asset] } });
};
