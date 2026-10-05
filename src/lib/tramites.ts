import content from "@country/tramites.json";
import { tramites } from "@country/tramites";
import { site } from "@country/site";
import type { TramiteContent } from "../countries/types";
import { iconOf } from "../data/orbit";

const verified: Record<string, TramiteContent> = content;

export const published = tramites
  .filter((tramite) => verified[tramite.slug] && !tramite.hold)
  .map((tramite) => {
    const entity = site.entities[tramite.entity];
    return { ...tramite, ...verified[tramite.slug], agency: { domain: tramite.entity, name: entity?.name ?? tramite.entity, icon: iconOf(tramite.entity) } };
  });

export type Published = (typeof published)[number];

export const pathOf = (slug: string) => `/tramites/${slug}`;

export const summaryOf = (answer: string, limit = 158) => {
  const lead = answer
    .split("\n")
    .find((line) => line.trim() && !line.startsWith("#") && !/^\s*([-*]|\d+\.)\s/.test(line))
    ?.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim() ?? "";
  return lead.length <= limit ? lead : `${lead.slice(0, lead.lastIndexOf(" ", limit - 1))}…`;
};

export const dateLabel = (iso: string) => new Intl.DateTimeFormat(site.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
