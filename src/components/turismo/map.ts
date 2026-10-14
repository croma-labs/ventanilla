import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

export const STYLE = "https://tiles.openfreemap.org/styles/positron";

/** El Salvador, framed. */
export const COUNTRY_BOUNDS: [[number, number], [number, number]] = [
  [-90.15, 13.1],
  [-87.65, 14.47],
];

export async function createMap(container: HTMLElement, options: { center?: [number, number]; zoom?: number; interactive?: boolean } = {}): Promise<{ map: MapLibreMap; maplibre: typeof import("maplibre-gl") }> {
  const [maplibre, { default: stylesheet }] = await Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css?url")]);
  await linkStylesheet(stylesheet);
  const map = new maplibre.Map({
    container,
    style: STYLE as unknown as StyleSpecification,
    center: options.center ?? [-88.9, 13.75],
    zoom: options.zoom ?? 7.4,
    bounds: options.center ? undefined : COUNTRY_BOUNDS,
    fitBoundsOptions: { padding: 24 },
    attributionControl: { compact: true },
    cooperativeGestures: options.interactive === false ? false : matchMedia("(pointer: coarse)").matches,
    interactive: options.interactive ?? true,
    maxBounds: [
      [-93.5, 10.5],
      [-84.5, 17],
    ],
    dragRotate: false,
    pitchWithRotate: false,
    locale: {
      "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + desplazamiento para acercar el mapa",
      "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + desplazamiento para acercar el mapa",
      "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
      "NavigationControl.ZoomIn": "Acercar",
      "NavigationControl.ZoomOut": "Alejar",
      "GeolocateControl.FindMyLocation": "Mi ubicación",
    },
  });
  map.touchZoomRotate.disableRotation();
  map.once("load", () => container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
  return { map, maplibre };
}

/** The map's stylesheet, as a cached file loaded the first time a map appears, never inlined into every page. */
function linkStylesheet(href: string): Promise<void> {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-maplibre]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.maplibre = "";
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

/** A pin: the brand's navy, white ring; a dashed ring when only the town or department is known. */
export function pinElement({ approximate, label, small = false }: { approximate: boolean; label: string; small?: boolean }): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  const size = small ? 14 : 22;
  element.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;background:${small ? "#0066c5" : "#0e1a33"};box-shadow:0 0 0 ${small ? 2 : 3}px #fff,0 6px 14px #0e1a3340;`;
  if (approximate && !small) {
    const ring = document.createElement("div");
    ring.style.cssText = "position:absolute;inset:-14px;border-radius:9999px;border:2px dashed #0e1a3366;background:#0e1a330d;";
    element.style.position = "relative";
    element.appendChild(ring);
  }
  return element;
}
