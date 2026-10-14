import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Picture } from "../../lib/turismo/images";
import type { Lang } from "../../lib/turismo/labels";

type Props = { name: string; photos: Picture[]; lang: Lang };

const COPY = {
  es: {
    open: (index: number, total: number, name: string) => `Ver foto ${index} de ${total} de ${name} en pantalla completa`,
    photo: (name: string, index: number) => `${name}, foto ${index}`,
    previous: "Foto anterior",
    next: "Foto siguiente",
    fullscreen: "Ver en pantalla completa",
    photos: (name: string) => `Fotos de ${name}`,
    close: "Cerrar",
  },
  en: {
    open: (index: number, total: number, name: string) => `Open photo ${index} of ${total} of ${name} full screen`,
    photo: (name: string, index: number) => `${name}, photo ${index}`,
    previous: "Previous photo",
    next: "Next photo",
    fullscreen: "View full screen",
    photos: (name: string) => `Photos of ${name}`,
    close: "Close",
  },
};

const control =
  "inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-text-primary shadow-control backdrop-blur transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2";

function useSlides(loop: boolean) {
  const [ref, api] = useEmblaCarousel({ loop, align: "start", containScroll: "trimSnaps" });
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setIndex(api.selectedScrollSnap());
    sync();
    api.on("select", sync).on("reInit", sync);
    return () => {
      api.off("select", sync).off("reInit", sync);
    };
  }, [api]);
  return { ref, api, index };
}

export default function Gallery({ name, photos, lang }: Props) {
  const copy = COPY[lang];
  const strip = useSlides(photos.length > 1);
  const [open, setOpen] = useState<number | null>(null);
  const many = photos.length > 1;

  return (
    <div className="relative">
      <div ref={strip.ref} className="overflow-hidden rounded-24 mobile:rounded-32">
        <div className="flex touch-pan-y">
          {photos.map((photo, index) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setOpen(index)}
              className="relative aspect-4/3 min-w-0 shrink-0 grow-0 basis-full cursor-zoom-in mobile:aspect-16/9"
              aria-label={copy.open(index + 1, photos.length, name)}
            >
              <img
                src={photo.src}
                srcSet={photo.srcset}
                sizes="(min-width: 1200px) 1150px, 100vw"
                alt={copy.photo(name, index + 1)}
                width={1200}
                height={800}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
      {many && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden="true">
            {photos.map((photo, index) => (
              <span key={photo.src} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${index === strip.index ? "w-5 opacity-100" : "w-1.5 opacity-60"}`} />
            ))}
          </div>
          <div className="absolute inset-y-0 left-3 hidden items-center mobile:flex">
            <button type="button" className={control} onClick={() => strip.api?.scrollPrev()} aria-label={copy.previous}>
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-3 hidden items-center mobile:flex">
            <button type="button" className={control} onClick={() => strip.api?.scrollNext()} aria-label={copy.next}>
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}
      <button type="button" onClick={() => setOpen(strip.index)} className={`${control} absolute top-3 right-3 size-10`} aria-label={copy.fullscreen}>
        <Expand size={17} />
      </button>
      {open !== null && <Lightbox name={name} photos={photos} lang={lang} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Lightbox({ name, photos, lang, start, onClose }: Props & { start: number; onClose: () => void }) {
  const copy = COPY[lang];
  const [ref, api] = useEmblaCarousel({ loop: photos.length > 1, startIndex: start });
  const [index, setIndex] = useState(start);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => {
    dialog.current?.close();
    onClose();
  }, [onClose]);

  useEffect(() => {
    dialog.current?.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const sync = () => setIndex(api.selectedScrollSnap());
    api.on("select", sync);
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") api.scrollPrev();
      if (event.key === "ArrowRight") api.scrollNext();
    };
    addEventListener("keydown", keys);
    return () => {
      api.off("select", sync);
      removeEventListener("keydown", keys);
    };
  }, [api]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-label={copy.photos(name)}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div ref={ref} className="h-full overflow-hidden">
        <div className="flex h-full">
          {photos.map((photo, i) => (
            <div key={photo.src} className="flex h-full min-w-0 shrink-0 grow-0 basis-full items-center justify-center p-2 mobile:p-10">
              <img src={photo.src} srcSet={photo.srcset} sizes="100vw" alt={copy.photo(name, i + 1)} className="max-h-full max-w-full rounded-12 object-contain" decoding="async" />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm tabular-nums">
          {index + 1} / {photos.length}
        </span>
        <button type="button" onClick={close} className={control} aria-label={copy.close}>
          <X size={20} />
        </button>
      </div>
      {photos.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 hidden justify-center gap-3 p-6 mobile:flex">
          <button type="button" className={control} onClick={() => api?.scrollPrev()} aria-label={copy.previous}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className={control} onClick={() => api?.scrollNext()} aria-label={copy.next}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </dialog>
  );
}
