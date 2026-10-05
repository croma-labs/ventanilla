import type { HeroCard } from "../../countries/types";

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")";

export const wash = ({ tone: [deep, mid, light] }: HeroCard) =>
  `radial-gradient(120% 90% at 85% 10%, ${light} 0%, transparent 55%), radial-gradient(90% 80% at 10% 100%, ${mid} 0%, transparent 60%), linear-gradient(160deg, ${mid} 0%, ${deep} 70%)`;

export default function Postcard({ card, detail }: { card: HeroCard; detail: boolean }) {
  if (card.image) return <img alt={card.alt} src={card.image} className="absolute inset-0 size-full object-cover" decoding="async" draggable={false} />;
  return (
    <div role="img" aria-label={card.alt} className="absolute inset-0 overflow-hidden" style={{ backgroundImage: wash(card) }}>
      <div aria-hidden className="absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: grain }} />
      {detail && (
        <>
          <div aria-hidden className="absolute -top-[18%] -right-[12%] aspect-square w-[62%] rounded-full border border-white/25" />
          <div aria-hidden className="absolute -top-[6%] right-[2%] aspect-square w-[38%] rounded-full border border-white/15" />
          <p
            aria-hidden
            className="absolute right-8 bottom-6 left-8 font-serif-display text-[clamp(3.5rem,11vw,7.5rem)] leading-[0.92] tracking-[-0.02em] text-balance text-white/95 mobile:right-12 mobile:bottom-10 mobile:left-12"
          >
            {card.title}
          </p>
        </>
      )}
    </div>
  );
}
