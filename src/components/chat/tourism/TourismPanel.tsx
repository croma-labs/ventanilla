import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { AgendaItem, Ficha } from "../../../lib/turismo/types";
import { ensureBrandSprite } from "../../turismo/BrandIcon";
import { COPY } from "./copy";
import { agendaOf, fichaOf } from "./data";
import EventRail from "./EventRail";
import { mentionsOf, type Mentions } from "../../../lib/turismo/mentions";
import PlaceRail from "./PlaceRail";
import { worthMapping } from "./spots";

const AnswerMap = lazy(() => import("./AnswerMap"));
const PlaceSheet = lazy(() => import("./PlaceSheet"));

/** The places and events an answer names, drawn in the conversation: cards, a map, and each place in full on a tap. */
export default function TourismPanel({ text, tourism }: { text: string; tourism?: Mentions }) {
  const mentions = useMemo(() => tourism ?? mentionsOf(text), [text, tourism]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [events, setEvents] = useState<AgendaItem[]>([]);
  const [open, setOpen] = useState<Ficha | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const copy = COPY[mentions.lang];
  const placesKey = mentions.places.join(",");
  const eventsKey = mentions.events.join(",");

  useEffect(() => {
    if (!mentions.places.length) return;
    let live = true;
    ensureBrandSprite();
    Promise.all(mentions.places.map(fichaOf)).then((found) => live && setFichas(found.filter((ficha): ficha is Ficha => ficha !== null)));
    return () => {
      live = false;
    };
  }, [placesKey]);

  useEffect(() => {
    if (!mentions.events.length) return;
    let live = true;
    ensureBrandSprite();
    agendaOf().then((agenda) => live && setEvents(mentions.events.map((slug) => agenda.find((event) => event.slug === slug)).filter((event): event is AgendaItem => !!event)));
    return () => {
      live = false;
    };
  }, [eventsKey]);

  useEffect(() => {
    const message = root.current?.closest<HTMLElement>('[data-slot="message"]');
    if (!message) return;
    const stay = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.closest("dialog")) return;
      const target = mentionsOf(anchor.getAttribute("href") ?? "");
      if (target.places[0]) {
        event.preventDefault();
        fichaOf(target.places[0]).then((ficha) => (ficha ? setOpen(ficha) : location.assign(anchor.href)));
      } else if (target.events[0]) {
        const card = message.querySelector<HTMLElement>(`[data-event="${target.events[0]}"]`);
        if (!card) return;
        event.preventDefault();
        card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        card.animate([{ boxShadow: "0 0 0 3px #f2b33d" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400, easing: "ease-out" });
      }
    };
    message.addEventListener("click", stay);
    return () => message.removeEventListener("click", stay);
  }, [fichas.length, events.length]);

  if (!fichas.length && !events.length) return <div ref={root} hidden />;

  return (
    <div ref={root} className="flex flex-col gap-3 pt-1">
      {fichas.length > 0 && <PlaceRail fichas={fichas} lang={mentions.lang} copy={copy} onOpen={setOpen} />}
      {worthMapping(fichas) && (
        <Suspense fallback={<div className="h-56 animate-pulse rounded-[22px] bg-surface-muted mobile:h-64" />}>
          <AnswerMap fichas={fichas} lang={mentions.lang} label={copy.map} onOpen={setOpen} />
        </Suspense>
      )}
      {events.length > 0 && <EventRail events={events} lang={mentions.lang} copy={copy} />}
      {open && (
        <Suspense fallback={null}>
          <PlaceSheet key={open.slug} ficha={open} lang={mentions.lang} copy={copy} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </div>
  );
}
