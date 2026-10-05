import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { site } from "@country/site";
import EntityIcon from "../chat/EntityIcon";
import { useReducedMotion } from "../../lib/hooks";
import { buttonBase } from "../../lib/ui";
import { cn } from "../../lib/cn";
import { Chip, useChipReveal, type Reveal } from "./reveal";

const perPage = 3;
const badgeAgencies = [...new Set([...site.showcase, ...site.orbit.map((entry) => entry.domain)])]
  .filter((domain) => site.entities[domain])
  .map((domain) => ({ ...site.entities[domain], domain }));
const fan = 0.43;

function useElementWidth(fallback: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || fallback));
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function Badge({ agency, index, progress }: { agency: (typeof badgeAgencies)[number]; index: number; progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const [ref, width] = useElementWidth(60);
  const x = useTransform(progress, [0, 1], [0, index * fan * width]);
  return (
    <motion.span
      ref={ref}
      aria-hidden
      className="absolute top-0 left-0 aspect-square h-full w-auto rounded-full drop-shadow-soft-sm mobile:drop-shadow-soft-md"
      style={{ x, zIndex: index }}
      initial={reduced ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : index * 0.035 }}
    >
      <span className="block size-full rounded-full bg-white p-[16%] ring-1 ring-[#0e1a33]/5">
        <EntityIcon domain={agency.iconFrom ?? agency.domain} short={agency.short} className="rounded-none bg-transparent" />
      </span>
    </motion.span>
  );
}

export default function BadgesChip({ reveal, at }: { reveal: Reveal; at: number }) {
  const chip = useChipReveal(reveal, at);
  const [clicks, setClicks] = useState(0);
  const descriptionId = useId();
  const offset = (clicks * perPage) % badgeAgencies.length;
  const shown = Array.from({ length: perPage }, (_, index) => badgeAgencies[(offset + index) % badgeAgencies.length]);
  const description = site.ui.badges.replace("{list}", new Intl.ListFormat(site.lang, { type: "conjunction" }).format(shown.map((agency) => agency.name)));

  return (
    <Chip motion={chip} className="relative" slotClassName="max-mobile:text-[1.1em]">
      <button
        type="button"
        aria-label={site.ui.badges.replace(": {list}", "")}
        aria-describedby={descriptionId}
        onClick={() => setClicks((value) => value + 1)}
        className={cn(buttonBase, "relative h-[0.980132em] w-auto shrink-0 rounded-full p-0 active:scale-100")}
        style={{ aspectRatio: 1.86 }}
      >
        <AnimatePresence initial={false}>
          {shown.map((agency, index) => (
            <Badge key={agency.domain} agency={agency} index={index} progress={chip.progress} />
          ))}
        </AnimatePresence>
      </button>
      <span id={descriptionId} hidden>
        {description}
      </span>
      <span role="status" className="sr-only">
        {clicks > 0 ? description : null}
      </span>
    </Chip>
  );
}
