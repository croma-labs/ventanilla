import { site } from "@country/site";
import type { HeroCard } from "../../countries/types";
import EntityIcon from "../chat/EntityIcon";

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

const photo = (name: string, size = "") => `/hero/${site.code}/${name}${size}.webp`;

const fallbackTone = ["#0e1a33", "#003893", "#fcd116"] as const;

const wash = ({ tone = fallbackTone }: HeroCard) => {
  const [deep, mid, light] = tone;
  return `radial-gradient(120% 90% at 85% 10%, ${light} 0%, transparent 55%), radial-gradient(90% 80% at 10% 100%, ${mid} 0%, transparent 60%), linear-gradient(160deg, ${mid} 0%, ${deep} 70%)`;
};

function Caption({ card }: { card: HeroCard }) {
  const entity = card.entity ? site.entities[card.entity] : undefined;
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 px-5 pt-14 pb-4 mobile:gap-4 mobile:px-11 mobile:pt-24 mobile:pb-10">
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-[#120a04]/75 via-[#120a04]/30 to-transparent" />
      {entity && card.entity && (
        <span className="flex items-center gap-2 rounded-full bg-white/14 py-1 pr-3.5 pl-1 text-[13px] leading-none font-medium text-white/95 ring-1 ring-white/20 backdrop-blur-md">
          <span className="size-6 shrink-0 overflow-hidden rounded-full bg-white p-0.5">
            <EntityIcon domain={entity.iconFrom ?? card.entity} short={entity.short} />
          </span>
          <span className="text-white/70">{site.brand.handledBy}</span>
          {entity.name}
        </span>
      )}
      <p className="font-serif-display text-[clamp(2.25rem,9vw,5.75rem)] leading-[0.92] tracking-[-0.02em] text-balance text-white drop-shadow-[0_2px_24px_rgb(0_0_0/0.25)]">
        {card.title}
      </p>
    </div>
  );
}

export default function Postcard({ card, detail, priority = false }: { card: HeroCard; detail: boolean; priority?: boolean }) {
  if (card.image)
    return (
      <div className="absolute inset-0 isolate overflow-hidden bg-[#2a1a0e]">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={`${photo(card.image, "-480")} 480w, ${photo(card.image, "-640")} 640w, ${photo(card.image, "-800")} 800w`}
            sizes="calc(100vw - 24px)"
          />
          <img
            alt={card.alt}
            src={photo(card.image)}
            srcSet={`${photo(card.image, "-800")} 800w, ${photo(card.image)} 1344w`}
            sizes="688px"
            className="absolute inset-0 -z-20 size-full object-cover"
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
            draggable={false}
          />
        </picture>
        {detail && <Caption card={card} />}
      </div>
    );
  return (
    <div role="img" aria-label={card.alt} className="absolute inset-0 isolate overflow-hidden" style={{ backgroundImage: wash(card) }}>
      <div aria-hidden className="absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: grain }} />
      {detail && <Caption card={card} />}
    </div>
  );
}
