import useEmblaCarousel from "embla-carousel-react";
import { motion, useAnimationFrame, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { site } from "@country/site";
import { cn } from "../../lib/cn";
import { usePageVisible, useReducedMotion } from "../../lib/hooks";
import { wrap } from "../../lib/math";
import { buttonBase, glassControl } from "../../lib/ui";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "../icons";
import Composer from "./Composer";
import Postcard, { wash } from "./Postcard";
import PromptTicker from "./PromptTicker";

const heroCards = site.hero.cards;
const autoplayMs = 4000;
const count = heroCards.length;
const label = (index: number) => site.ui.example.replace("{n}", String(index + 1)).replace("{total}", String(count)).replace("{text}", heroCards[index].prompt);
const prompts = heroCards.map((card) => card.prompt);

function Backdrop({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (position) => Math.max(0, 1 - Math.abs(wrap(-count / 2, count / 2, index - position))));
  return (
    <motion.div aria-hidden className="absolute inset-0 will-change-[opacity]" style={{ opacity }}>
      <div className="absolute inset-0 bg-cover bg-center blur-3xl" style={{ backgroundImage: wash(heroCards[index]) }} />
    </motion.div>
  );
}

function Slide({ index, mounted }: { index: number; mounted: boolean }) {
  return <div className="absolute inset-0 overflow-hidden">{mounted && <Postcard card={heroCards[index]} detail priority={index === 0} />}</div>;
}

function PlaybackIcon({ paused }: { paused: boolean }) {
  const layer = "transition-[opacity,transform] duration-150 ease-out-quint";
  return (
    <div className="relative">
      <div aria-hidden className={cn("absolute inset-0 flex items-center justify-center", layer, paused ? "opacity-100" : "scale-[0.97] opacity-0")}>
        <PlayIcon />
      </div>
      <div aria-hidden className={cn(layer, paused ? "scale-[0.97] opacity-0" : "opacity-100")}>
        <PauseIcon />
      </div>
    </div>
  );
}

export default function Hero() {
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const [viewport, api] = useEmblaCarousel({ loop: true, duration: reduced ? 0 : 25 });
  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  const [selected, setSelected] = useState(0);
  const [mounted, setMounted] = useState(() => new Set([0, 1, count - 1]));
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pause = useCallback(() => setPaused(true), []);

  useEffect(() => {
    if (!api) return;
    const engine = api.internalEngine();
    const onScroll = () => {
      const size = engine.slideRects[0]?.width || 1;
      const position = -(engine.location.get() - engine.scrollSnaps[0]) / size;
      progress.set(position);
      setSelected(wrap(0, count, Math.round(position)));
    };
    const onSelect = () => {
      elapsed.current = 0;
      setSelected(api.selectedScrollSnap());
    };
    const onSettle = () => progress.set(api.selectedScrollSnap());
    const onPointerDown = () => {
      setPaused(true);
      setDragging(true);
    };
    const onPointerUp = () => {
      setDragging(false);
      elapsed.current = 0;
    };
    api.on("scroll", onScroll).on("select", onSelect).on("settle", onSettle).on("pointerDown", onPointerDown).on("pointerUp", onPointerUp);
    return () => {
      api.off("scroll", onScroll).off("select", onSelect).off("settle", onSettle).off("pointerDown", onPointerDown).off("pointerUp", onPointerUp);
    };
  }, [api, progress]);

  useEffect(() => {
    setMounted((current) => {
      const next = new Set(current);
      [-1, 0, 1].forEach((offset) => next.add(wrap(0, count, selected + offset)));
      return next.size === current.size ? current : next;
    });
  }, [selected]);

  const running = !reduced && visible && !hovered && !dragging && !paused;

  useAnimationFrame((_, delta) => {
    if (!running || !api) return;
    elapsed.current += Math.min(delta, 100);
    if (elapsed.current < autoplayMs) return;
    elapsed.current = 0;
    api.scrollNext();
  });

  const step = (direction: -1 | 1) => {
    pause();
    if (direction < 0) api?.scrollPrev();
    else api?.scrollNext();
  };

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-carousel-control]") && target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  };

  return (
    <div data-slot="carousel" data-has-own-composer className="relative mb-4 flex flex-col mobile:mx-8 mobile:mb-8" onKeyDownCapture={onKeyDownCapture}>
      <section className="relative isolate flex flex-col items-center rounded-40 pt-40 pb-10 mobile:min-h-[calc(100svh-92px)] mobile:justify-center mobile:rounded-48 mobile:px-8 mobile:pt-36 mobile:pb-36">
        <div
          aria-hidden
          className="squircle pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-40 bg-linear-to-b from-[#f4f5f7] to-[#f8f8f9] [clip-path:inset(0_round_var(--radius-40))] mobile:rounded-48 mobile:[clip-path:inset(0_round_var(--radius-48))]"
        >
          <div className="absolute top-[-16%] left-[-12%] h-[132%] w-[124%] opacity-[0.07] saturate-0">
            {heroCards.map((card, index) => (
              <Backdrop key={card.slug} index={index} progress={progress} />
            ))}
          </div>
        </div>

        <div className="flex w-full max-w-[687.5px] flex-col items-center gap-[62px] mobile:gap-12">
          <div className="landing-heading flex w-full flex-col items-center gap-4 px-8 text-center mobile:gap-5 mobile:px-0">
            <h1 data-site-hero-enter="0" className="type-site-1 text-text-primary max-mobile:text-[clamp(36px,12vw,48px)]">
              {site.hero.greeting}
            </h1>
            <p data-site-hero-enter="1" className="font-sans-display text-2xl text-pretty text-text-secondary">
              {site.hero.subtitle}
            </p>
          </div>

          <div className="relative w-full">
            <div
              data-site-hero-enter="2"
              className="z-20 max-md:relative max-md:mx-3 max-md:mb-4 mobile:absolute mobile:inset-x-4 mobile:top-4"
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
            >
              <Composer
                variant="hero"
                autoFocus
                fallback={prompts[selected]}
                onInteract={pause}
                preview={<PromptTicker prompts={prompts} selected={selected} progress={progress} paused={paused} hovered={hovered} reduced={reduced} />}
              />
            </div>

            <div role="region" aria-roledescription="carousel" aria-label={site.ui.examples}>
              <div data-site-hero-enter="3" className="max-md:mx-3">
                <div
                  ref={viewport}
                  data-slot="carousel-content"
                  className="squircle relative isolate cursor-grab touch-pan-y touch-pinch-zoom overflow-hidden rounded-24 shadow-hero-photo active:cursor-grabbing mobile:rounded-[calc(58px*var(--corner-scale))]"
                >
                  <div className="flex">
                    {heroCards.map((card, index) => (
                      <div
                        key={card.slug}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={label(index)}
                        aria-hidden={index !== selected}
                        data-slot="carousel-item"
                        className="relative aspect-3/2 min-w-0 shrink-0 grow-0 basis-full mobile:aspect-551/367"
                      >
                        <Slide index={index} mounted={mounted.has(index)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p aria-atomic aria-live={paused || reduced ? "polite" : "off"} className="sr-only">
                {`${label(selected)} ${heroCards[selected].alt}`}
              </p>
              <div data-site-hero-enter="4" className="relative z-20 mt-10 mobile:mt-12">
                <div data-testid="carousel-controls" className="relative flex items-center justify-center gap-2.5">
                  <button type="button" data-carousel-control aria-label={site.ui.prev} onClick={() => step(-1)} className={cn(buttonBase, glassControl, "p-0")}>
                    <ChevronLeftIcon />
                  </button>
                  {!reduced && (
                    <button
                      type="button"
                      data-carousel-control
                      aria-label={paused ? site.ui.play : site.ui.pause}
                      onClick={() => {
                        elapsed.current = 0;
                        setPaused((value) => !value);
                      }}
                      className={cn(buttonBase, glassControl, "p-0")}
                    >
                      <PlaybackIcon paused={paused} />
                    </button>
                  )}
                  <button type="button" data-carousel-control aria-label={site.ui.next} onClick={() => step(1)} className={cn(buttonBase, glassControl, "p-0")}>
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
