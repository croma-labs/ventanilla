import { readFile } from "node:fs/promises";

export const country = process.env.COUNTRY ?? "co";

const source = await readFile(new URL(`../src/countries/${country}/site.ts`, import.meta.url), "utf8");

export const timeZone = source.match(/timeZone: "([^"]+)"/)?.[1] ?? "UTC";
