import { site } from "@country/site";
import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { orbitPeriodMs, orbitTiles, projectTile, restingAngle } from "../../data/orbit";
import { cn } from "../../lib/cn";
import { usePageVisible, useReducedMotion } from "../../lib/hooks";
import { buttonBase } from "../../lib/ui";
import { PauseIcon, PlayIcon } from "../icons";
import type { OrbitRenderer } from "./orbit-renderer";

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

const staticTiles = orbitTiles.map((tile) => {
  const projected = projectTile(tile, restingAngle);
  return {
    label: tile.label,
    left: `${round(projected.x * 100, 2)}%`,
    top: `${round(projected.y * 100, 2)}%`,
    width: `${round(projected.width * 100, 2)}%`,
    height: `${round(projected.height * 100, 2)}%`,
    opacity: round(projected.opacity),
    filter: `brightness(${round(projected.brightness)})`,
    zIndex: projected.order,
  };
});

function OrbitStatic() {
  return (
    <>
      {staticTiles.map((tile, index) => (
        <span
          key={index}
          aria-hidden
          className="absolute grid -translate-1/2 place-items-center overflow-hidden rounded-[6%] bg-white px-[4%] text-center font-serif-display leading-none text-text-primary shadow-elevation-1 [container-type:inline-size]"
          style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height, opacity: tile.opacity, filter: tile.filter, zIndex: tile.zIndex }}
        >
          <span style={{ fontSize: "13cqi" }}>{tile.label}</span>
        </span>
      ))}
    </>
  );
}

export default function FederalOrbit({ className }: { className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const nearView = useInView(frame, { once: true, margin: "800px" });
  const inView = useInView(frame);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const renderer = useRef<OrbitRenderer | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!nearView || !canvas.current) return;
    let cancelled = false;
    import("./orbit-renderer")
      .then(({ createOrbitRenderer }) => createOrbitRenderer(canvas.current!))
      .then((instance) => {
        if (cancelled) return instance.destroy();
        renderer.current = instance;
        instance.resize();
        instance.render(restingAngle);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, [nearView]);

  useEffect(() => {
    if (!ready || !frame.current) return;
    const observer = new ResizeObserver(() => {
      renderer.current?.resize();
      renderer.current?.render(restingAngle + (elapsed.current / orbitPeriodMs) * Math.PI * 2);
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [ready]);

  const spinning = ready && !failed && !reduced && !paused && inView && visible;

  useEffect(() => {
    if (!spinning) return;
    let last = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      elapsed.current += Math.min(now - last, 100);
      last = now;
      renderer.current?.render(restingAngle + (elapsed.current / orbitPeriodMs) * Math.PI * 2);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [spinning]);

  return (
    <div ref={frame} data-slot="federal-orbit" className={cn(className, "isolate bg-background-primary-invert")}>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {!ready && <OrbitStatic />}
        {!failed && <canvas ref={canvas} className={cn("absolute inset-0 size-full", !ready && "invisible")} />}
      </div>
      <p className="sr-only">An animated sphere of government website previews rotates, illustrating 29,000 websites brought together in one place.</p>
      {!reduced && !failed && (
        <div className="absolute right-6 bottom-6 z-10">
          <button
            type="button"
            aria-label={paused ? site.ui.orbitPlay : site.ui.orbitPause}
            onClick={() => setPaused((value) => !value)}
            className={cn(
              buttonBase,
              "size-11 rounded-full border border-blue-900/2 bg-background-primary-invert/50 p-0 text-text-primary-invert backdrop-blur-frost hover:bg-background-primary-invert/60 [&_svg]:size-5",
            )}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        </div>
      )}
    </div>
  );
}
