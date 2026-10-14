import { useEffect, useRef, useState } from "react";
import { deFr, type Lang } from "../../lib/turismo/labels";
import { createMap, pinElement } from "./map";

type Pin = { lat: number; lng: number; name: string; href?: string };

const MAP_OF: Record<Lang, (name: string) => string> = { es: (name) => `Mapa de ${name}`, en: (name) => `Map of ${name}`, pt: (name) => `Mapa de ${name}`, fr: (name) => `Carte ${deFr(name)}` };

type Props = { place: Pin & { approximate: boolean }; around?: Pin[]; className?: string; zoom?: number; lang: Lang };

export default function PlaceMap({ place, around = [], className, zoom, lang }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let remove = () => {};
    createMap(container.current, { center: [place.lng, place.lat], zoom: zoom ?? (place.approximate ? 11.5 : 13.5), lang }).then(({ map, maplibre }) => {
      if (cancelled) return map.remove();
      remove = () => map.remove();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      for (const other of around) {
        const element = pinElement({ approximate: false, label: other.name, small: true });
        element.style.cursor = "pointer";
        const popup = new maplibre.Popup({ offset: 12, closeButton: false }).setHTML(
          `<a href="${other.href ?? "#"}" style="font:500 14px/1.3 var(--font-body);color:#0e1a33;text-decoration:none">${escape(other.name)}</a>`,
        );
        new maplibre.Marker({ element }).setLngLat([other.lng, other.lat]).setPopup(popup).addTo(map);
      }
      new maplibre.Marker({ element: pinElement({ approximate: place.approximate, label: place.name }) }).setLngLat([place.lng, place.lat]).addTo(map);
      map.once("load", () => setReady(true));
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, [place.lat, place.lng]);

  return (
    <div className={`relative overflow-hidden rounded-24 bg-surface-muted ${className ?? ""}`}>
      <div ref={container} className="size-full" aria-label={MAP_OF[lang](place.name)} role="region" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-muted to-blue-50" aria-hidden="true" />}
    </div>
  );
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
