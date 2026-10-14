import { CalendarPlus, Globe, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import { calendarHref } from "../../../lib/turismo/calendar";
import { dateRange, formatDate } from "../../../lib/turismo/dates";
import type { Lang } from "../../../lib/turismo/labels";
import type { AgendaItem } from "../../../lib/turismo/types";
import BrandIcon, { hasBrand, NETWORK_LABEL } from "../../turismo/BrandIcon";
import type { Copy } from "./copy";

type Props = { events: AgendaItem[]; lang: Lang; copy: Copy };

const chip =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border-tertiary px-3 text-[13px] font-medium transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2";

export default function EventRail({ events, lang, copy }: Props) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] mobile:mx-0 mobile:px-0 [&::-webkit-scrollbar]:hidden" aria-label={copy.events}>
      {events.map((event, index) => {
        const calendar = calendarHref(event, lang);
        return (
          <li key={event.slug} data-chat-rise className="w-[84%] max-w-[340px] shrink-0 snap-start" style={{ "--rise-delay": `${index * 60}ms` } as CSSProperties}>
            <article data-event={event.slug} className="flex h-full flex-col gap-3 rounded-[22px] border border-border-quaternary bg-background-primary p-3.5">
              <div className="flex gap-3">
                {event.start && (
                  <div className="flex w-14 shrink-0 flex-col items-center self-start overflow-hidden rounded-[14px] bg-blue-700 text-white" aria-hidden="true">
                    <span className="w-full bg-[#f2b33d] py-0.5 text-center text-[10px] font-semibold tracking-wide text-blue-900 uppercase">
                      {formatDate(event.start, lang, {
                        month: "short",
                      }).replace(".", "")}
                    </span>
                    <span className="pt-0.5 pb-1 font-serif-display text-[1.7rem] leading-none">{formatDate(event.start, lang, { day: "numeric" })}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-serif-display text-[1.25rem] leading-[1.08] text-balance">{event.name}</h4>
                  <p className="mt-1 text-[13px] font-medium text-blue-600">
                    <time dateTime={event.start ?? undefined}>{dateRange(event.start, event.end, lang)}</time>
                  </p>
                  {(event.venue || event.department) && (
                    <p className="mt-0.5 flex items-start gap-1 text-[13px] text-text-secondary">
                      <MapPin size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                      {[event.venue, event.department !== event.venue ? event.department : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {calendar && (
                  <a href={calendar} download={`${event.slug}.ics`} className={chip}>
                    <CalendarPlus size={14} strokeWidth={1.75} />
                    {copy.addToCalendar}
                  </a>
                )}
                {event.links.slice(0, 2).map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={chip}>
                    {hasBrand(link.label) ? <BrandIcon name={link.label} size={14} /> : <Globe size={14} strokeWidth={1.75} />}
                    {link.label === "web" ? copy.moreInfo : (NETWORK_LABEL[link.label as keyof typeof NETWORK_LABEL] ?? copy.moreInfo)}
                  </a>
                ))}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
