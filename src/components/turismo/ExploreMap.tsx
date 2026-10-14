import type { GeoJSONSource, Map as MapLibreMap, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { KIND_LABEL, type Lang } from "../../lib/turismo/labels";
import type { IndexRow } from "../../lib/turismo/types";
import { COUNTRY_BOUNDS, createMap } from "./map";

const APPROXIMATE: Record<Lang, string> = { es: "aprox.", en: "approx.", pt: "aprox.", fr: "approx." };

type Props = { rows: IndexRow[]; hrefOf: (row: IndexRow) => string; className?: string; lang: Lang };

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function features(rows: IndexRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows
      .filter((row) => row.p)
      .map((row, index) => ({
        type: "Feature" as const,
        id: index,
        geometry: { type: "Point" as const, coordinates: [row.p![1], row.p![0]] },
        properties: { s: row.s, n: row.n, k: row.k, m: row.m ?? "", d: row.d ?? "", i: row.i ?? "", exact: row.p![2] === 0 ? 1 : 0 },
      })),
  };
}

export default function ExploreMap({ rows, hrefOf, className, lang }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const rowsRef = useRef(rows);
  const [ready, setReady] = useState(false);
  rowsRef.current = rows;

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    createMap(container.current, { lang }).then(({ map, maplibre }) => {
      if (cancelled) return map.remove();
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");
      map.on("load", () => {
        map.addSource("places", { type: "geojson", data: features(rowsRef.current), cluster: true, clusterRadius: 44, clusterMaxZoom: 13 });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "places",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0e1a33",
            "circle-opacity": 0.92,
            "circle-radius": ["step", ["get", "point_count"], 16, 20, 20, 100, 26, 400, 32],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "places",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"] },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "pins",
          type: "circle",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["case", ["==", ["get", "exact"], 1], "#0066c5", "#ffffff"],
            "circle-radius": ["case", ["==", ["get", "exact"], 1], 7, 6],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": ["case", ["==", ["get", "exact"], 1], "#ffffff", "#0066c5"],
          },
        });
        map.on("click", "clusters", async (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const zoom = await (map.getSource("places") as GeoJSONSource).getClusterExpansionZoom(feature.properties.cluster_id);
          map.easeTo({ center: (feature.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom: zoom + 0.4 });
        });
        map.on("click", "pins", (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const props = feature.properties as { s: string; n: string; k: IndexRow["k"]; m: string; d: string; i: string; exact: number };
          const row = rowsRef.current.find((candidate) => candidate.s === props.s);
          const href = row ? hrefOf(row) : "#";
          popupRef.current?.remove();
          popupRef.current = new maplibre.Popup({ offset: 12, closeButton: false, maxWidth: "260px" })
            .setLngLat((feature.geometry as unknown as { coordinates: [number, number] }).coordinates)
            .setHTML(
              `<a href="${href}" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:#0e1a33;font-family:var(--font-body)">${
                props.i ? `<img src="${props.i}" alt="" width="56" height="56" style="width:56px;height:56px;border-radius:12px;object-fit:cover;flex-shrink:0">` : ""
              }<span><span style="display:block;font-size:12px;color:#0e1a33a8">${escape(KIND_LABEL[lang][props.k].one)}${props.exact ? "" : ` · ${APPROXIMATE[lang]}`}</span><span style="display:block;font:400 19px/1.1 var(--font-serif-display)">${escape(props.n)}</span><span style="display:block;font-size:12px;color:#0e1a33a8;margin-top:2px">${escape([props.m, props.d].filter(Boolean).join(", "))}</span></span></a>`,
            )
            .addTo(map);
        });
        for (const layer of ["clusters", "pins"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const boundsRef = useRef<[[number, number], [number, number]]>(COUNTRY_BOUNDS);
  const fittedRef = useRef(false);

  /** Frame the results. The whole country is wide and a phone is narrow, so there it starts a little closer and lets the far coasts run off the edge. */
  const fit = (map: MapLibreMap, duration: number) => {
    map.resize();
    const country = boundsRef.current === COUNTRY_BOUNDS;
    const narrow = map.getContainer().clientWidth < 560;
    if (country && narrow) {
      const camera = map.cameraForBounds(COUNTRY_BOUNDS, { padding: 8 });
      if (camera) map.easeTo({ center: [-88.95, 13.72], zoom: (camera.zoom ?? 7) + 0.55, duration });
      return;
    }
    map.fitBounds(boundsRef.current, { padding: 40, maxZoom: 12.5, duration });
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("places") as GeoJSONSource | undefined)?.setData(features(rows));
    popupRef.current?.remove();
    const located = rows.filter((row) => row.p);
    if (!located.length) return;
    const lats = located.map((row) => row.p![0]);
    const lngs = located.map((row) => row.p![1]);
    boundsRef.current =
      located.length > 600
        ? COUNTRY_BOUNDS
        : [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ];
    fit(map, fittedRef.current ? 600 : 0);
    fittedRef.current = true;
  }, [rows, ready]);

  useEffect(() => {
    const element = container.current;
    if (!ready || !element) return;
    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      fit(map, 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div className={`relative overflow-hidden bg-surface-muted ${className ?? ""}`}>
      <div ref={container} className="size-full" role="region" aria-label="Mapa de lugares turísticos" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-muted to-blue-50" aria-hidden="true" />}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-3 rounded-full bg-white/92 px-3 py-1.5 text-[12px] text-text-secondary shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500 ring-2 ring-white" />Ubicación exacta</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white ring-2 ring-blue-500" />Aproximada</span>
      </div>
    </div>
  );
}
