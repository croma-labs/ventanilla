import { useEffect, useState } from "react";
import { site } from "@country/site";
import { useReducedMotion } from "../../lib/hooks";
import { buttonBase } from "../../lib/ui";
import { cn } from "../../lib/cn";
import { ArrowRightIcon } from "../icons";
import { Chip, useChipReveal, type Reveal } from "./reveal";

type Phase = "idle" | "playing" | "flag" | "resetting";

const flagHoldMs = 1500;
const stripe = 26 / site.manifesto.flag.length;
const flagMarkup = `<svg class="block w-full h-auto" viewBox="0 0 44 26" xmlns="http://www.w3.org/2000/svg">${site.manifesto.flag
  .map((color, index) => `<rect y="${index * stripe}" width="44" height="${stripe + 0.2}" fill="${color}"/>`)
  .join("")}</svg>`;

export default function ArrowChip({ reveal, at }: { reveal: Reveal; at: number }) {
  const chip = useChipReveal(reveal, at);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = phase !== "idle";

  useEffect(() => {
    if (phase !== "flag") return;
    const timer = setTimeout(() => setPhase(reduced ? "idle" : "resetting"), flagHoldMs);
    return () => clearTimeout(timer);
  }, [phase, reduced]);

  return (
    <Chip
      motion={chip}
      className="drop-shadow-soft-lg max-mobile:absolute max-mobile:right-[0.166667em]"
      slotClassName="max-mobile:relative max-mobile:w-0 max-mobile:-mr-[0.166667em]"
    >
      <button
        type="button"
        data-phase={phase}
        aria-label={site.ui.flagLabel}
        aria-disabled={busy || undefined}
        onClick={() => busy || setPhase(reduced ? "flag" : "playing")}
        onAnimationEnd={({ animationName }) => {
          if (animationName === "manifesto-flag-reveal") setPhase("flag");
          if (animationName === "manifesto-flag-return") setPhase("idle");
        }}
        className={cn(buttonBase, "manifesto-arrow relative size-em min-h-11 min-w-11 rounded-full p-0 text-primary-invert active:scale-100 max-mobile:size-[1.111458em]")}
      >
        <span aria-hidden className="manifesto-arrow-disc absolute inset-0 bg-dark-blue" />
        <span aria-hidden className="manifesto-arrow-glyph absolute inset-0 flex items-center justify-center">
          <ArrowRightIcon className="size-em-half" />
        </span>
        <span aria-hidden className="manifesto-arrow-spinner absolute inset-[31.25%] rounded-full border-2 border-current/25 border-t-current border-r-current opacity-0" />
        <span aria-hidden className="manifesto-arrow-flag absolute inset-x-0 top-[20.4545%] overflow-hidden opacity-0" dangerouslySetInnerHTML={{ __html: flagMarkup }} />
      </button>
      <span role="status" className="sr-only">
        {phase === "flag" ? site.ui.flagDone : null}
      </span>
    </Chip>
  );
}
