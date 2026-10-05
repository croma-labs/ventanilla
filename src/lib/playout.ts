import { useEffect, useRef, useState } from "react";

const backlogWindowMs = 800;
const minRate = 0.15;
const maxRate = 0.45;
const maxFrameMs = 32;
const snapWindow = 24;
const commitEveryMs = 120;

const snapBack = (text: string, position: number) => {
  if (position >= text.length) return text.length;
  const floor = Math.max(0, position - snapWindow);
  for (let index = position; index > floor; index--) if (/\s/.test(text[index - 1])) return index;
  return position;
};

const skipLinkLabel = (text: string, position: number) => {
  const open = text.lastIndexOf("[", position);
  if (open === -1 || text.lastIndexOf("]", position - 1) > open) return position;
  const close = text.indexOf(")", text.indexOf("](", open));
  return close === -1 ? position : Math.max(position, close + 1);
};

export function useTextPlayout(text: string, streaming: boolean, animate: boolean) {
  const [visible, setVisible] = useState(() => (animate ? text.slice(0, snapBack(text, Math.min(text.length, snapWindow))) : text));
  const position = useRef(visible.length);
  const latest = useRef({ text, streaming });
  latest.current = { text, streaming };
  const running = animate && (streaming || visible.length < text.length);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let sinceCommit = 0;
    let frame = requestAnimationFrame(function tick(now) {
      const { text: full } = latest.current;
      const dt = Math.min(now - last, maxFrameMs);
      last = now;
      const backlog = full.length - position.current;
      const rate = Math.min(maxRate, Math.max(minRate, backlog / backlogWindowMs));
      const advanced = position.current + rate * dt;
      position.current = Math.min(full.length, Math.max(advanced, skipLinkLabel(full, Math.floor(advanced))));
      sinceCommit += dt;
      const caughtUp = position.current >= full.length;
      if (sinceCommit >= commitEveryMs || caughtUp) {
        sinceCommit = 0;
        const end = caughtUp ? full.length : snapBack(full, Math.floor(position.current));
        setVisible((current) => (end > current.length ? full.slice(0, end) : current));
      }
      if (caughtUp && !latest.current.streaming) return;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return { visible: animate ? visible : text, playing: running };
}
