import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Lang } from "../../lib/turismo/labels";

export const STYLE = "https://tiles.openfreemap.org/styles/positron";

/** El Salvador, framed. */
export const COUNTRY_BOUNDS: [[number, number], [number, number]] = [
  [-90.15, 13.1],
  [-87.65, 14.47],
];

const CONTROLS: Record<Lang, Record<string, string>> = {
  es: {
    "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + desplazamiento para acercar el mapa",
    "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + desplazamiento para acercar el mapa",
    "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
    "NavigationControl.ZoomIn": "Acercar",
    "NavigationControl.ZoomOut": "Alejar",
    "GeolocateControl.FindMyLocation": "Mi ubicación",
  },
  en: {
    "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + scroll to zoom the map",
    "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + scroll to zoom the map",
    "CooperativeGesturesHandler.MobileHelpText": "Use two fingers to move the map",
    "NavigationControl.ZoomIn": "Zoom in",
    "NavigationControl.ZoomOut": "Zoom out",
    "GeolocateControl.FindMyLocation": "Find my location",
  },
  pt: {
    "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + deslocamento para aproximar o mapa",
    "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + deslocamento para aproximar o mapa",
    "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
    "NavigationControl.ZoomIn": "Aproximar",
    "NavigationControl.ZoomOut": "Afastar",
    "GeolocateControl.FindMyLocation": "A minha localização",
  },
  fr: {
    "CooperativeGesturesHandler.WindowsHelpText": "Utilisez Ctrl + défilement pour zoomer sur la carte",
    "CooperativeGesturesHandler.MacHelpText": "Utilisez ⌘ + défilement pour zoomer sur la carte",
    "CooperativeGesturesHandler.MobileHelpText": "Utilisez deux doigts pour déplacer la carte",
    "NavigationControl.ZoomIn": "Zoomer",
    "NavigationControl.ZoomOut": "Dézoomer",
    "GeolocateControl.FindMyLocation": "Ma position",
  },
};

export async function createMap(container: HTMLElement, options: { center?: [number, number]; zoom?: number; interactive?: boolean; lang?: Lang } = {}): Promise<{ map: MapLibreMap; maplibre: typeof import("maplibre-gl") }> {
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
    locale: CONTROLS[options.lang ?? "es"],
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
