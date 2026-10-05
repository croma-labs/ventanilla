import { motion, useTransform, type MotionValue } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { window01 } from "../../lib/math";

const wordSpan = 0.3;
const startScale = 0.95;

export type Reveal = {
  progress: MotionValue<number>;
  tail: MotionValue<number>;
  count: number;
};

export const splitWords = (text: string) =>
  text.split("\n").flatMap((line, lineIndex) =>
    line
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word, wordIndex) => ({ word, breakBefore: lineIndex > 0 && wordIndex === 0 })),
  );

export const countWords = (text: string) => splitWords(text).length;

function RevealWord({ word, at, reveal }: { word: string; at: number; reveal: Reveal }) {
  const { start, end } = window01(at, reveal.count, wordSpan);
  const opacity = useTransform(reveal.progress, [start, end], [0, 1], { clamp: true });
  const y = useTransform(opacity, [0, 1], [8, 0]);
  const scale = useTransform(opacity, [0, 1], [startScale, 1]);
  const filter = useTransform(opacity, (value) => (value >= 1 ? "none" : `blur(${(1 - value) * 6}px)`));
  return (
    <motion.span className="my-[-0.2em] inline-block max-w-full py-[0.2em]" style={{ opacity, y, scale, filter }}>
      {word}
    </motion.span>
  );
}

export function RevealWords({ text, from, reveal, breakFirstLineOnMobile = false }: { text: string; from: number; reveal: Reveal; breakFirstLineOnMobile?: boolean }) {
  const words = splitWords(text);
  const firstBreak = words.findIndex(({ breakBefore }) => breakBefore);
  return (
    <span aria-hidden>
      {words.map(({ word, breakBefore }, index) => (
        <Fragment key={`${from + index}-${word}`}>
          {index > 0 && " "}
          {breakBefore && <br className={breakFirstLineOnMobile && index === firstBreak ? undefined : "hidden mobile:block"} />}
          <RevealWord word={word} at={from + index} reveal={reveal} />
        </Fragment>
      ))}
    </span>
  );
}

export function useChipReveal(reveal: Reveal, at: number) {
  const { start, end } = window01(at, reveal.count, wordSpan);
  const opacity = useTransform(reveal.progress, [start, end], [0, 1], { clamp: true });
  return {
    opacity,
    scale: useTransform(opacity, [0, 1], [startScale, 1]),
    progress: useTransform(reveal.progress, [start, 1], [0, 1], { clamp: true }),
  };
}

export type ChipReveal = ReturnType<typeof useChipReveal>;

export function Chip({ motion: { opacity, scale }, className, slotClassName, children }: { motion: ChipReveal; className?: string; slotClassName?: string; children: ReactNode }) {
  return (
    <span data-slot="manifesto-chip" className={cn("inline-flex align-middle", slotClassName)}>
      <motion.span className={cn("relative z-10 flex shrink-0 items-center justify-center", className)} style={{ opacity, scale }}>
        {children}
      </motion.span>
    </span>
  );
}
