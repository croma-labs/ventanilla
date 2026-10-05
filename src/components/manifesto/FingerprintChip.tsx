import { site } from "@country/site";
import { useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { fingerprintRidges, fingerprintViewBox } from "../../data/fingerprint";
import { useReducedMotion } from "../../lib/hooks";
import { window01 } from "../../lib/math";
import { buttonBase } from "../../lib/ui";
import { cn } from "../../lib/cn";
import { Chip, useChipReveal, type Reveal } from "./reveal";

type Phase = "idle" | "scanning" | "checked" | "returning";

const ridgeSpan = 0.35;
const dash = (amount: number) => `${amount} ${1 - 2 * amount} ${amount} 1`;

function Ridge({ d, index, clipId, progress }: { d: string; index: number; clipId: string; progress: MotionValue<number> }) {
  const path = useRef<SVGPathElement>(null);
  const { start, end } = window01(index, fingerprintRidges.length, ridgeSpan);
  const drawn = useTransform(progress, [start, end], [0, 0.5], { clamp: true });
  useMotionValueEvent(drawn, "change", (value) => path.current?.setAttribute("stroke-dasharray", dash(value)));
  return (
    <>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path ref={path} d={d} clipPath={`url(#${clipId})`} fill="none" pathLength={1} stroke="currentColor" strokeDasharray={dash(drawn.get())} strokeWidth={4} />
    </>
  );
}

function FingerprintGlyph({ progress, onScanEnd }: { progress: MotionValue<number>; onScanEnd: () => void }) {
  const id = useId().replaceAll(/[^A-Za-z0-9_-]/g, "");
  return (
    <svg aria-hidden className="fingerprint-glyph size-full overflow-visible" viewBox={fingerprintViewBox}>
      <g fill="currentColor" opacity={0.2}>
        {fingerprintRidges.map((d) => (
          <path d={d} key={d} />
        ))}
      </g>
      {fingerprintRidges.map((d, index) => (
        <Ridge key={d} d={d} index={index} clipId={`${id}-ridge-${index}`} progress={progress} />
      ))}
      <defs>
        <clipPath id={`${id}-scan`}>
          {fingerprintRidges.map((d) => (
            <path d={d} key={d} />
          ))}
        </clipPath>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.9" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-scan)`}>
        <rect className="fingerprint-light" width="75" height="24" fill={`url(#${id}-light)`} onAnimationEnd={onScanEnd} />
      </g>
    </svg>
  );
}

function AnimatedCheck({ checked }: { checked: boolean }) {
  return (
    <svg fill="none" viewBox="0 0 20 20" className="size-full">
      <path
        d="M2.7 9.7 7.95 14.6 17.3 4.7"
        pathLength={100}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        className={cn(
          "[stroke-dasharray:100] transition-[stroke-dashoffset,opacity] duration-500 ease-in-out motion-reduce:transition-none",
          checked ? "opacity-100 [stroke-dashoffset:0]" : "opacity-0 [stroke-dashoffset:100]",
        )}
      />
    </svg>
  );
}

export default function FingerprintChip({ reveal, at }: { reveal: Reveal; at: number }) {
  const chip = useChipReveal(reveal, at);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [completed, setCompleted] = useState(0);
  const descriptionId = useId();
  const draw = useTransform([chip.progress, reveal.tail], ([progress, tail]: number[]) => (progress + tail) / 2);

  const check = () => {
    setPhase("checked");
    setCompleted((value) => value + 1);
  };

  useEffect(() => {
    if (phase !== "checked" && phase !== "returning") return;
    const timer = setTimeout(() => setPhase(phase === "checked" ? "returning" : "idle"), phase === "checked" ? 1100 : 450);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <Chip
      motion={chip}
      className="absolute top-1/2 left-1/2 size-[1.4375em] -translate-1/2 rounded-full text-pink-500"
      slotClassName="relative -mr-[0.09375em] -ml-[0.0625em] size-em max-mobile:text-[1.1em]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-[0.15625em] rounded-full bg-manifesto-frost backdrop-blur-[10px]" />
      <button
        type="button"
        data-phase={phase}
        aria-label={site.ui.fingerprint}
        aria-describedby={descriptionId}
        aria-disabled={phase !== "idle" || undefined}
        onClick={() => phase === "idle" && (reduced ? check() : setPhase("scanning"))}
        className={cn(buttonBase, "fingerprint-action relative size-full rounded-full p-em-third text-inherit active:scale-95 motion-reduce:active:scale-100")}
      >
        <span aria-hidden className="fingerprint-check absolute inset-0 flex items-center justify-center p-em-third">
          <AnimatedCheck checked={phase === "checked"} />
        </span>
        <FingerprintGlyph progress={draw} onScanEnd={check} />
      </button>
      <span id={descriptionId} hidden>
        A fingerprint scan that ends with a checkmark.
      </span>
      <span role="status" className="sr-only">
        {completed > 0 ? <span key={completed}>{site.ui.fingerprintDone}</span> : null}
      </span>
    </Chip>
  );
}
