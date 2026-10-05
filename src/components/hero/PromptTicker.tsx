import { site } from "@country/site";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { cn } from "../../lib/cn";
import { clamp01, wrap } from "../../lib/math";

const staggerSpan = 0.28;
const maxBlur = 6;
const marqueeSpeed = 40;

type PromptTickerProps = {
  prompts: readonly string[];
  selected: number;
  progress: MotionValue<number>;
  paused: boolean;
  hovered: boolean;
  reduced: boolean;
};

const segmentWords = (text: string) => {
  const segmenter = new Intl.Segmenter("en", { granularity: "word" });
  const words: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    if (/^\s+$/.test(segment)) words.push(" ");
    else if (words.length && words.at(-1) !== " ") words[words.length - 1] += segment;
    else words.push(segment);
  }
  return words;
};

function PromptWords({ words }: { words: string[] }) {
  return (
    <span>
      {words.map((word, index) => (word === " " ? " " : <span className="inline-block" data-word key={index}>{word}</span>))}
    </span>
  );
}

export default function PromptTicker({ prompts, selected, progress, paused, hovered, reduced }: PromptTickerProps) {
  const rows = useRef<(HTMLSpanElement | null)[]>([]);
  const lines = useMemo(() => prompts.map((prompt) => segmentWords(`${site.hero.tryPrefix} «${prompt}»`)), [prompts]);
  const count = prompts.length;

  const paint = (position: number) => {
    rows.current.forEach((row, index) => {
      if (!row) return;
      const distance = reduced ? index - selected : wrap(-count / 2, count / 2, index - position);
      row.style.opacity = Math.abs(distance) < 1 ? "1" : "0";
      const travel = Math.min(1, Math.abs(distance));
      const incoming = distance > 0;
      const words = row.querySelector(".home-prompt-track > span")?.querySelectorAll<HTMLElement>("[data-word]") ?? [];
      words.forEach((word, wordIndex) => {
        const offset = (wordIndex / Math.max(1, words.length - 1)) * staggerSpan;
        const local = clamp01(((incoming ? 1 - travel : travel) - offset) / (1 - staggerSpan));
        const shift = reduced ? 0 : incoming ? 1 - local : local;
        word.style.transform = shift === 0 ? "none" : `translateY(${Math.sign(distance) * shift * 100}%)`;
        word.style.opacity = String((1 - shift) ** 2);
        word.style.filter = shift === 0 ? "none" : `blur(${shift * maxBlur}px)`;
      });
    });
  };

  useLayoutEffect(() => paint(progress.get()), [selected, reduced]);
  useMotionValueEvent(progress, "change", paint);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      rows.current.forEach((row) => {
        const track = row?.querySelector<HTMLElement>(".home-prompt-track");
        const first = track?.firstElementChild as HTMLElement | null;
        if (!row || !track || !first) return;
        const overflow = first.offsetWidth > row.clientWidth;
        row.toggleAttribute("data-overflow", overflow);
        row.style.setProperty("--marquee-duration", `${(track.scrollWidth || first.offsetWidth * 2) / marqueeSpeed}s`);
      });
    });
    rows.current.forEach((row) => row && observer.observe(row));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hovered) return;
    const row = rows.current[selected];
    row?.getAnimations({ subtree: true }).forEach((animation) => {
      const delay = Number(animation.effect?.getTiming().delay ?? 0);
      if (Number(animation.currentTime ?? 0) < delay) animation.currentTime = delay;
    });
  }, [hovered, selected]);

  return (
    <span
      className="relative block h-lh w-full"
      style={paused ? ({ "--marquee-play-state": "paused" } as CSSProperties) : undefined}
    >
      {lines.map((words, index) => (
        <span
          key={index}
          ref={(node) => {
            rows.current[index] = node;
          }}
          data-selected={index === selected ? "" : undefined}
          className={cn("prompt-row absolute inset-x-0 -my-2 overflow-x-clip overflow-y-visible py-2 whitespace-nowrap")}
          style={{ opacity: index === selected ? 1 : 0 }}
        >
          <span className="home-prompt-track">
            <PromptWords words={words} />
            <PromptWords words={words} />
          </span>
        </span>
      ))}
    </span>
  );
}
