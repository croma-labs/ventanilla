import type { Lang } from "./labels";
import type { Happening } from "./types";

const compact = (iso: string) => iso.replaceAll("-", "");
const nextDay = (iso: string) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const escape = (text: string) => text.replace(/[,;]/g, "\\$&");

/** An all-day calendar entry for an event, as a link the phone opens in its calendar. */
export function calendarHref(event: Pick<Happening, "id" | "name" | "start" | "end" | "venue" | "department">, lang: Lang): string | null {
  if (!event.start) return null;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Ventanilla//Turismo El Salvador//${lang.toUpperCase()}`,
    "BEGIN:VEVENT",
    `UID:${event.id}@sv.usecroma.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${compact(event.start)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(event.end ?? event.start))}`,
    `SUMMARY:${escape(event.name)}`,
    ...(event.venue ? [`LOCATION:${escape([event.venue, event.department, "El Salvador"].filter(Boolean).join(", "))}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
