import { Navigation, Phone } from "lucide-react";
import type { CSSProperties } from "react";
import { KIND_LABEL, type Lang } from "../../../lib/turismo/labels";
import type { Ficha } from "../../../lib/turismo/types";
import BrandIcon from "../../turismo/BrandIcon";
import KindIcon from "../../turismo/KindIcon";
import type { Copy } from "./copy";

type Props = {
  fichas: Ficha[];
  lang: Lang;
  copy: Copy;
  onOpen: (ficha: Ficha) => void;
};

const pressable = "border border-border-tertiary text-text-primary transition-colors hover:bg-surface-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2";
const round = `inline-flex size-9 shrink-0 items-center justify-center rounded-full ${pressable}`;
const wide = `inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap ${pressable}`;

/** The places an answer names, as cards to swipe through: a tap opens the place, the buttons act on it. */
export default function PlaceRail({ fichas, lang, copy, onOpen }: Props) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] mobile:mx-0 mobile:px-0 [&::-webkit-scrollbar]:hidden" aria-label={copy.places}>
      {fichas.map((ficha, index) => {
        const photo = ficha.ownPhotos ? ficha.photos[0] : undefined;
        return (
          <li key={ficha.slug} data-chat-rise className="w-[78%] max-w-[300px] shrink-0 snap-start" style={{ "--rise-delay": `${index * 60}ms` } as CSSProperties}>
            <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-border-quaternary bg-background-primary shadow-[0_1px_2px_#0e1a330a]">
              <button
                type="button"
                onClick={() => onOpen(ficha)}
                className="group flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
                aria-label={`${copy.details}: ${ficha.name}`}
              >
                <span className={`relative block w-full overflow-hidden bg-surface-muted ${photo ? "aspect-[4/3]" : "aspect-[16/7]"}`}>
                  {photo ? (
                    <img
                      src={photo.src}
                      srcSet={photo.srcset}
                      sizes="300px"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-gradient-to-br from-blue-50 via-surface-muted to-[#fdf3dc]">
                      <span className="mt-4 inline-flex size-12 items-center justify-center rounded-full bg-white/80 shadow-sm">
                        <KindIcon kind={ficha.kind} size={22} className="text-blue-700" />
                      </span>
                    </span>
                  )}
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-0.5 text-[12px] font-medium text-text-primary shadow-sm backdrop-blur">
                    <KindIcon kind={ficha.kind} size={12} />
                    {KIND_LABEL[lang][ficha.kind].one}
                  </span>
                  {ficha.registered && (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-blue-700/90 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur" title={copy.registeredLong}>
                      {copy.registered}
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-1 px-3.5 pt-3 pb-2">
                  <span className="font-serif-display text-[1.35rem] leading-[1.05] text-balance text-text-primary">{ficha.name}</span>
                  <span className="text-[13px] text-text-secondary">{[ficha.municipality, ficha.department].filter(Boolean).join(", ")}</span>
                  {ficha.summary[lang] && <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-text-secondary">{ficha.summary[lang]}</span>}
                </span>
              </button>
              <span className="flex gap-1.5 px-3 pt-1 pb-3">
                {ficha.phones[0] && (
                  <a href={ficha.phones[0].href} className={round} aria-label={`${copy.call}: ${ficha.name}`}>
                    <Phone size={16} strokeWidth={1.75} />
                  </a>
                )}
                {ficha.whatsapp && (
                  <a href={ficha.whatsapp} target="_blank" rel="noopener noreferrer" className={round} aria-label={`${copy.whatsapp}: ${ficha.name}`}>
                    <BrandIcon name="whatsapp" size={16} className="text-[#25D366]" />
                  </a>
                )}
                <a href={ficha.directions} target="_blank" rel="noopener noreferrer" className={wide}>
                  <Navigation size={15} strokeWidth={1.75} />
                  {copy.directions}
                </a>
              </span>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
