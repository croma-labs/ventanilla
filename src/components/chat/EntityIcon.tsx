import icons from "@country/icons.json";
import { site } from "@country/site";
import { useState } from "react";
import { cn } from "../../lib/cn";
import Monogram from "./Monogram";

const vendored: Record<string, string> = icons;

const official = (domain: string) => site.officialSuffixes.some((suffix) => (suffix.startsWith(".") ? domain.endsWith(suffix) : domain === suffix || domain.endsWith(`.${suffix}`)));

const iconFor = (domain: string) => vendored[domain] ?? (official(domain) ? `/api/icon?d=${encodeURIComponent(domain)}` : null);

export default function EntityIcon({ domain, short, className }: { domain: string; short: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = iconFor(domain);
  if (failed || !src) return <Monogram seed={domain} label={short} className={className} />;
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("block size-full rounded-full bg-white object-contain", className)}
    />
  );
}
