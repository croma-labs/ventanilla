import { cubicBezier } from "motion";
import { useLayoutEffect, useRef } from "react";
import type { Origin } from "../../lib/chat-store";
import { clamp } from "../../lib/math";

const durationMs = 440;
const ease = cubicBezier(0.32, 0.72, 0, 1);

const blurAt = (peak: number, t: number) => peak * (1 - (t < 0.6 ? (t / 0.6) * 0.4 : 0.4 + ((t - 0.6) / 0.4) * 0.6));

function startFrom(bubble: DOMRect, origin: Origin | null) {
  if (origin) {
    return {
      x: clamp(-720, 720, origin.left + origin.width - bubble.right),
      y: clamp(-640, 640, origin.top + origin.height - (origin.fixed ? 0 : scrollY - origin.scrollY) - bubble.bottom),
      sx: clamp(0.2, 3.4, origin.width / bubble.width),
      sy: clamp(0.2, 3.4, origin.height / bubble.height),
      blur: 4,
    };
  }
  const shells = [...document.querySelectorAll('[data-slot="ask-dock"] [data-slot="chat-input-shell"]')];
  const shell = shells.at(-1)?.getBoundingClientRect();
  if (!shell) return { x: 0, y: 96, sx: 1, sy: 0.86, blur: 14 };
  return {
    x: clamp(-220, 220, shell.right - 52 - bubble.right),
    y: clamp(-640, 640, shell.bottom - (bubble.top + bubble.height / 2)),
    sx: clamp(1, 3.4, Math.max(shell.width - 40, bubble.width) / bubble.width),
    sy: 0.86,
    blur: 14,
  };
}

export default function UserBubble({ text, origin, fly }: { text: string; origin: Origin | null; fly: boolean }) {
  const bubble = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = bubble.current;
    const span = line.current;
    if (!element || !span) return;
    element.style.width = "";
    const widest = Math.max(...[...span.getClientRects()].map((rect) => rect.width));
    element.style.width = `${Math.ceil(widest + 40)}px`;
  }, [text]);

  useLayoutEffect(() => {
    const element = bubble.current;
    if (!fly || !element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = startFrom(element.getBoundingClientRect(), origin);
    const started = performance.now();
    element.style.transformOrigin = "100% 100%";
    element.style.willChange = "transform, filter";
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      const e = ease(t);
      element.style.transform = `translate3d(${from.x * (1 - e)}px, ${from.y * (1 - e)}px, 0) scale(${from.sx + (1 - from.sx) * e}, ${from.sy + (1 - from.sy) * e})`;
      element.style.filter = `blur(${blurAt(from.blur, t)}px)`;
      if (t < 1) frame = requestAnimationFrame(step);
      else element.style.transform = element.style.filter = element.style.willChange = element.style.transformOrigin = "";
    };
    step(started);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [fly, origin]);

  return (
    <div data-slot="message" data-align="end" className="group/message relative flex w-full min-w-0 flex-row-reverse gap-2 type-body-m">
      <div data-slot="message-content" dir="auto" className="flex w-full min-w-0 flex-col gap-2.5 wrap-break-word">
        <div ref={bubble} data-slot="bubble" className="flex w-fit max-w-[90%] min-w-0 flex-col items-end gap-2 self-end sm:max-w-[80%]">
          <div
            data-slot="bubble-content"
            className="w-fit max-w-full min-w-0 overflow-hidden rounded-32 bg-background-tertiary px-5 py-4 type-body-m leading-normal tracking-normal wrap-break-word whitespace-pre-wrap text-primary"
          >
            <span ref={line}>{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
