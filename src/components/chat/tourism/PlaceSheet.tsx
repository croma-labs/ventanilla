import { Clock, ExternalLink, Globe, Mail, MapPin, Navigation, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KIND_LABEL, type Lang } from "../../../lib/turismo/labels";
import type { Ficha } from "../../../lib/turismo/types";
import BrandIcon, { hasBrand, NETWORK_LABEL } from "../../turismo/BrandIcon";
import Gallery from "../../turismo/Gallery";
import KindIcon from "../../turismo/KindIcon";
import PlaceMap from "../../turismo/PlaceMap";
import type { Copy } from "./copy";

type Props = { ficha: Ficha; lang: Lang; copy: Copy; onClose: () => void };

const row = "flex items-start gap-3 py-3 text-[15px]";
const icon = "mt-0.5 shrink-0 text-text-tertiary";
const link = "font-medium underline-offset-4 hover:underline focus-visible:underline";
const button =
  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border-tertiary px-4 text-[15px] font-medium transition-colors hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2";

/** A place, in full, without leaving the conversation. */
export default function PlaceSheet({ ficha, lang, copy, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const description = ficha.description[lang] ?? ficha.description.es;
  const translated = !!ficha.description[lang];
  const hours = ficha.hours[lang] ?? ficha.hours.es;
  const paragraphs = (description ?? "").split("\n").filter((line) => line.trim());
  const shown = expanded ? paragraphs : paragraphs.slice(0, 2);
  const where = [ficha.municipality, ficha.department].filter(Boolean).join(", ");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
      element?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-label={ficha.name}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-32 bg-background-primary p-0 text-text-primary backdrop:bg-black/40 backdrop:backdrop-blur-[2px] mobile:m-auto mobile:max-w-[640px] mobile:rounded-32"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="relative flex h-14 shrink-0 items-center justify-center px-4 mobile:px-6">
          <span className="h-1.5 w-10 rounded-full bg-border-tertiary mobile:hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 inline-flex size-10 items-center justify-center rounded-full bg-surface-muted transition-colors hover:bg-background-secondary mobile:right-4"
            aria-label={copy.close}
          >
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] mobile:px-6">
          {ficha.photos.length > 0 && ficha.ownPhotos && <Gallery name={ficha.name} photos={ficha.photos} lang={lang} />}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-[13px] font-medium">
              <KindIcon kind={ficha.kind} size={14} />
              {KIND_LABEL[lang][ficha.kind].one}
            </span>
            {ficha.registered && <span className="rounded-full bg-blue-50 px-3 py-1 text-[13px] font-medium text-blue-600">{copy.registeredLong}</span>}
          </div>
          <h2 className="mt-3 font-serif-display text-[2.4rem] leading-[0.98] tracking-[-0.02em] text-balance">{ficha.name}</h2>
          {where && (
            <p className="mt-2 flex items-center gap-1.5 text-[15px] text-text-secondary">
              <MapPin size={16} strokeWidth={1.75} />
              {where}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {ficha.phones[0] && (
              <a href={ficha.phones[0].href} className={button}>
                <Phone size={17} strokeWidth={1.75} />
                {copy.call}
              </a>
            )}
            {ficha.whatsapp && (
              <a href={ficha.whatsapp} target="_blank" rel="noopener noreferrer" className={button}>
                <BrandIcon name="whatsapp" size={17} className="text-[#25D366]" />
                {copy.whatsapp}
              </a>
            )}
            <a href={ficha.directions} target="_blank" rel="noopener noreferrer" className={button}>
              <Navigation size={17} strokeWidth={1.75} />
              {copy.directions}
            </a>
          </div>

          {paragraphs.length > 0 && (
            <section className="mt-7">
              <h3 className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">{copy.about}</h3>
              <div lang={translated ? undefined : "es"} className="mt-2 flex flex-col gap-3 text-[16px] leading-relaxed text-pretty text-text-primary/90">
                {shown.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {paragraphs.length > 2 && (
                <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-[15px] font-medium text-blue-600 underline-offset-4 hover:underline">
                  {expanded ? copy.less : copy.more}
                </button>
              )}
              {!translated && lang !== "es" && <p className="mt-2 text-[13px] text-text-tertiary">{copy.original}</p>}
            </section>
          )}

          {(ficha.address || hours || ficha.phones.length > 0 || ficha.emails.length > 0 || ficha.website || ficha.socials.length > 0) && (
            <section className="mt-7">
              <h3 className="text-[13px] font-semibold tracking-wide text-text-tertiary uppercase">{copy.contact}</h3>
              <ul className="mt-1 divide-y divide-border-quaternary">
                {ficha.address && (
                  <li className={row}>
                    <MapPin size={18} strokeWidth={1.75} className={icon} />
                    <span>{ficha.address}</span>
                  </li>
                )}
                {hours && (
                  <li className={row}>
                    <Clock size={18} strokeWidth={1.75} className={icon} />
                    <span lang={ficha.hours[lang] ? undefined : "es"}>{hours}</span>
                  </li>
                )}
                {ficha.phones.map((phone) => (
                  <li key={phone.href} className={row}>
                    <Phone size={18} strokeWidth={1.75} className={icon} />
                    <a href={phone.href} className={link}>
                      {phone.label}
                    </a>
                  </li>
                ))}
                {ficha.emails.map((email) => (
                  <li key={email} className={row}>
                    <Mail size={18} strokeWidth={1.75} className={icon} />
                    <a href={`mailto:${email}`} className={`${link} break-all`}>
                      {email}
                    </a>
                  </li>
                ))}
                {ficha.website && (
                  <li className={row}>
                    <Globe size={18} strokeWidth={1.75} className={icon} />
                    <a href={ficha.website} target="_blank" rel="noopener noreferrer" className={`${link} break-all`}>
                      {new URL(ficha.website).hostname.replace(/^www\./, "")}
                    </a>
                  </li>
                )}
              </ul>
              {ficha.socials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {ficha.socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-border-tertiary px-3.5 text-[14px] font-medium hover:bg-surface-muted"
                    >
                      {hasBrand(social.network) ? <BrandIcon name={social.network} size={16} /> : <Globe size={16} strokeWidth={1.75} />}
                      {social.handle ? (social.network === "web" ? social.handle : `@${social.handle}`) : NETWORK_LABEL[social.network]}
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          {ficha.point && (
            <section className="mt-7">
              <PlaceMap
                lang={lang}
                className="h-56"
                zoom={{ exact: 13.5, town: 12, department: 9 }[ficha.point.precision]}
                place={{
                  lat: ficha.point.lat,
                  lng: ficha.point.lng,
                  name: ficha.name,
                  approximate: ficha.point.precision !== "exact",
                }}
              />
              {ficha.point.precision !== "exact" && <p className="mt-2 text-[13px] text-text-tertiary">{copy.approximate}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={ficha.directions} target="_blank" rel="noopener noreferrer" className={button}>
                  Google Maps
                </a>
                <a href={ficha.waze} target="_blank" rel="noopener noreferrer" className={button}>
                  <BrandIcon name="waze" size={16} />
                  Waze
                </a>
              </div>
            </section>
          )}

          <a href={ficha.pages[lang]} className="mt-7 flex items-center justify-center gap-2 rounded-full bg-blue-700 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-blue-800">
            {copy.page}
            <ExternalLink size={16} strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </dialog>
  );
}
