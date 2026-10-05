import { site } from "@country/site";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { usePageVisible } from "../../lib/hooks";
import { buttonBase } from "../../lib/ui";
import { LockIcon } from "../icons";

const fraction = (value: number) => value - Math.floor(value);
const coordinate = (seed: number) => Math.round(fraction(Math.sin(seed) * 43758.5453) * 40000) / 100;

const starGroups = Array.from({ length: 6 }, (_, group) =>
  Array.from({ length: 20 }, (_, index) => {
    const seed = group * 20 + index + 1;
    return {
      cx: coordinate(seed * 127.1),
      cy: coordinate(seed * 311.7),
      r: index % 7 === 0 ? 0.8 : 0.4,
    };
  }),
);

function StarField({ playing }: { playing: boolean }) {
  return (
    <svg
      aria-hidden
      data-playing={playing}
      className="home-privacy-stars pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
    >
      {starGroups.map((stars, group) => (
        <g key={group} style={{ animationDelay: `${-1.7 * group}s`, animationDuration: `${10 + group}s` }}>
          {stars.map((star, index) => (
            <circle key={index} {...star} />
          ))}
        </g>
      ))}
      <g className="privacy-companion-star">
        <circle cx={310} cy={82} r={1.1} />
      </g>
    </svg>
  );
}

function ShootingStar() {
  const [launches, setLaunches] = useState(0);
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-label={site.ui.star}
      onClick={() => {
        if (active) return;
        setActive(true);
        setLaunches((value) => value + 1);
      }}
      className={cn(buttonBase, "absolute top-[13%] left-[18%] z-10 size-11 -translate-1/2 rounded-full p-0 text-text-primary-invert active:scale-100")}
    >
      <svg aria-hidden className="privacy-star-beacon size-2" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="1.1" fill="currentColor" />
        <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      </svg>
      {active && (
        <span
          key={launches}
          aria-hidden
          onAnimationEnd={() => setActive(false)}
          className="shooting-star-trail pointer-events-none absolute top-1/2 right-1/2 h-px w-20 rounded-full"
        />
      )}
      <span role="status" className="sr-only">
        {launches > 0 ? <span key={launches}>{site.ui.starDone}</span> : null}
      </span>
    </button>
  );
}

function useCenterBand<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || entered) return;
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting || entry.boundingClientRect.top < innerHeight * 0.4) && setEntered(true),
      { rootMargin: "-40% 0px -40% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [entered]);
  return [ref, entered] as const;
}

export default function PrivacyCard({ className }: { className?: string }) {
  const sky = useRef<HTMLDivElement>(null);
  const visible = usePageVisible();
  const skyInView = useInView(sky, { amount: 0.5 });
  const [sentinel, locked] = useCenterBand<HTMLSpanElement>();

  return (
    <div ref={sky} className={cn(className, "home-privacy-sky grid place-items-center p-4")}>
      <StarField playing={skyInView && visible} />
      <ShootingStar />
      <div data-visible={locked} className="home-privacy-lock relative grid size-[130px] shrink-0 place-items-center rounded-full bg-[#e6e8ea] text-black shadow-glass-toast">
        <span ref={sentinel} aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-px" />
        <LockIcon size={44} />
      </div>
    </div>
  );
}
