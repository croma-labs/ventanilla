import { BedDouble, Car, Compass, Info, Landmark, Sparkles, User, UtensilsCrossed, Waves } from "lucide-react";
import type { Kind } from "../../lib/turismo/types";

const ICONS = {
  destination: Compass,
  attraction: Landmark,
  lodging: BedDouble,
  restaurant: UtensilsCrossed,
  surf_school: Waves,
  recreation: Sparkles,
  transport: Car,
  tourist_info: Info,
  guide: User,
} as const;

export default function KindIcon({ kind, size = 18, className }: { kind: Kind; size?: number; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.75} className={className} />;
}
