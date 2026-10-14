import { LOCALE, type Lang } from "./labels";

export const formatDate = (iso: string, lang: Lang, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE[lang], { ...options, timeZone: "UTC" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));

export const dateRange = (start: string | null, end: string | null, lang: Lang = "es") => {
  if (!start) return "";
  const format = (iso: string, options: Intl.DateTimeFormatOptions) => formatDate(iso, lang, options);
  if (!end || end === start) return format(start, { weekday: "short", day: "numeric", month: "short" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) return lang === "en" ? `${format(start, { month: "short", day: "numeric" })}–${format(end, { day: "numeric" })}` : `${format(start, { day: "numeric" })}–${format(end, { day: "numeric", month: "short" })}`;
  return `${format(start, { day: "numeric", month: "short" })} – ${format(end, { day: "numeric", month: "short" })}`;
};
