import { siFacebook, siInstagram, siTiktok, siWaze, siWhatsapp, siX, siYoutube } from "simple-icons";
import type { Social } from "../../lib/turismo/types";

const PATHS = {
  instagram: siInstagram.path,
  facebook: siFacebook.path,
  tiktok: siTiktok.path,
  x: siX.path,
  youtube: siYoutube.path,
  whatsapp: siWhatsapp.path,
  waze: siWaze.path,
} as const;

export const NETWORK_LABEL: Record<Social["network"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  web: "Sitio web",
};

export type Brand = keyof typeof PATHS;

export const hasBrand = (name: string): name is Brand => name in PATHS;

/** Every brand mark once per page; icons reference them instead of repeating the paths. */
export function BrandSprite() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
      {Object.entries(PATHS).map(([name, path]) => (
        <symbol key={name} id={`brand-${name}`} viewBox="0 0 24 24">
          <path d={path} />
        </symbol>
      ))}
    </svg>
  );
}

export default function BrandIcon({ name, size = 18, className }: { name: Brand; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} className={className} fill="currentColor">
      <use href={`#brand-${name}`} />
    </svg>
  );
}
