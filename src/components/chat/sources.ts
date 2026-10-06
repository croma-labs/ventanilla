import { site } from "@country/site";
import type { Entity } from "../../countries/types";

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const known = Object.keys(site.entities).sort((a, b) => b.length - a.length);

export const domainOf = (url: string) => {
  const host = hostOf(url);
  return known.find((domain) => host === domain || host.endsWith(`.${domain}`)) ?? host;
};

const initials = (host: string) =>
  host
    .split(".")[0]
    .replace(/[^a-z]/gi, "")
    .slice(0, 2)
    .toUpperCase();

export const agencyFor = (url: string): Entity & { domain: string; icon: string } => {
  const domain = domainOf(url);
  const entity = site.entities[domain] ?? { name: domain, short: initials(domain) };
  return { domain, icon: entity.iconFrom ?? domain, ...entity };
};

export function groupByAgency<T extends { url: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  items.forEach((item) => groups.set(domainOf(item.url), [...(groups.get(domainOf(item.url)) ?? []), item]));
  return [...groups.entries()].map(([domain, entries]) => ({ domain, agency: agencyFor(entries[0].url), entries }));
}
