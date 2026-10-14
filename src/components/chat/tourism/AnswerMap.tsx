import { useEffect, useRef, useState } from "react";
import type { Lang } from "../../../lib/turismo/labels";
import type { Ficha } from "../../../lib/turismo/types";
import { createMap, pinElement } from "../../turismo/map";
import { spotsOf } from "./spots";

type Props = {
  fichas: Ficha[];
  lang: Lang;
  label: string;
  onOpen: (ficha: Ficha) => void;
};

function badge(pin: HTMLElement, count: number) {
  const label = document.createElement("span");
  label.textContent = String(count);
  label.style.cssText =
    "position:absolute;top:-9px;right:-11px;min-width:18px;height:18px;padding:0 5px;border-radius:9999px;background:#f2b33d;color:#0e1a33;font:600 11px/18px var(--font-body);text-align:center;box-shadow:0 0 0 2px #fff;";
  pin.style.position = "relative";
  pin.appendChild(label);
}

/** Every place an answer names, pinned and framed; a pin opens its place. */
export default function AnswerMap({ fichas, lang, label, onOpen }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const open = useRef(onOpen);
  const [ready, setReady] = useState(false);
  const spots = spotsOf(fichas);
  const key = fichas.map((ficha) => ficha.slug).join(",");
  open.current = onOpen;

  useEffect(() => {
    const element = container.current;
    if (!element || !spots.length) return;
    let cancelled = false;
    let remove = () => {};
    createMap(element, {
      center: [spots[0].lng, spots[0].lat],
      zoom: spots[0].exact ? 13 : 12,
      lang,
    }).then(({ map, maplibre }) => {
      if (cancelled) return map.remove();
      remove = () => map.remove();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      const bounds = new maplibre.LngLatBounds();
      for (const spot of spots) {
        const pin = pinElement({
          approximate: !spot.exact,
          label: spot.fichas.map((ficha) => ficha.name).join(", "),
        });
        if (spot.fichas.length > 1) badge(pin, spot.fichas.length);
        pin.style.cursor = "pointer";
        pin.addEventListener("click", () => open.current(spot.fichas[0]));
        new maplibre.Marker({ element: pin }).setLngLat([spot.lng, spot.lat]).addTo(map);
        bounds.extend([spot.lng, spot.lat]);
      }
      const frame = () => spots.length > 1 && map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
      frame();
      map.once("load", () => {
        frame();
        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, [key, lang]);

  return (
    <div data-chat-rise className="relative h-56 overflow-hidden rounded-[22px] bg-surface-muted mobile:h-64">
      <div ref={container} className="size-full" role="region" aria-label={label} />
      {!ready && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-muted to-blue-50" aria-hidden="true" />}
    </div>
  );
}
