import { cn } from "../../lib/cn";

const hue = (seed: string) => [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 7);

export default function Monogram({ seed, label, className }: { seed: string; label: string; className?: string }) {
  const h = hue(seed);
  return (
    <span
      aria-hidden
      className={cn("grid size-full place-items-center rounded-full font-sans text-[0.5rem] leading-none font-semibold tracking-[0.02em] text-white", className)}
      style={{ background: `linear-gradient(145deg, oklch(0.58 0.13 ${h}), oklch(0.38 0.11 ${(h + 40) % 360}))`, containerType: "inline-size" }}
    >
      <span style={{ fontSize: "38cqi" }}>{label}</span>
    </span>
  );
}
