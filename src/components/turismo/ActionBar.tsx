import { Check, Navigation, Phone, Share2 } from "lucide-react";
import { useState } from "react";
import type { Lang } from "../../lib/turismo/labels";
import BrandIcon from "./BrandIcon";

type Props = { name: string; phone: string | null; whatsapp: string | null; directions: string | null; url: string; lang: Lang };

const COPY = {
  es: { call: "Llamar", directions: "Cómo llegar", share: "Compartir", copied: "Enlace copiado" },
  en: { call: "Call", directions: "Directions", share: "Share", copied: "Link copied" },
};

const item =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-16 py-2 text-[12px] font-medium text-text-primary transition-colors active:bg-surface-muted mobile:h-12 mobile:flex-row mobile:gap-2 mobile:rounded-full mobile:border mobile:border-border-tertiary mobile:px-5 mobile:text-[15px] mobile:hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2";

export default function ActionBar({ name, phone, whatsapp, directions, url, lang }: Props) {
  const copy = COPY[lang];
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
      } catch {
        return;
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-quaternary bg-background-primary/92 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl mobile:static mobile:z-auto mobile:border-0 mobile:bg-transparent mobile:p-0 mobile:backdrop-blur-none">
      <div className="mx-auto flex max-w-[520px] gap-1 mobile:max-w-none mobile:flex-wrap mobile:gap-2">
        {phone && (
          <a href={phone} className={item}>
            <Phone size={20} strokeWidth={1.75} />
            {copy.call}
          </a>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={item}>
            <BrandIcon name="whatsapp" size={19} className="text-[#25D366]" />
            WhatsApp
          </a>
        )}
        {directions && (
          <a href={directions} target="_blank" rel="noopener noreferrer" className={item}>
            <Navigation size={20} strokeWidth={1.75} />
            {copy.directions}
          </a>
        )}
        <button type="button" onClick={share} className={item}>
          {copied ? <Check size={20} strokeWidth={1.75} /> : <Share2 size={20} strokeWidth={1.75} />}
          {copied ? copy.copied : copy.share}
        </button>
      </div>
    </div>
  );
}
