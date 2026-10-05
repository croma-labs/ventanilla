import icons from "@country/icons.json";
import { site } from "@country/site";

export const orbitSites = site.orbit;

const vendored: Record<string, string> = icons;

export const iconOf = (domain: string) => vendored[site.entities[domain]?.iconFrom ?? domain] ?? `/api/icon?d=${encodeURIComponent(domain)}`;

export type OrbitSite = (typeof orbitSites)[number];

export type OrbitTile = { site: OrbitSite; x: number; y: number; z: number; size: number };

export type ProjectedTile = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  brightness: number;
  order: number;
};

const tileCount = orbitSites.length * 2;
const tilt = -0.13;
const radius = 1.8221 * 0.38;
const tileWidth = 0.25;
const tileHeight = (334 / 480) * tileWidth;

export const orbitTiles: OrbitTile[] = Array.from({ length: tileCount }, (_, t) => {
  const y = 1 - (2 * (t + 0.5)) / tileCount;
  const theta = t * Math.PI * (3 - Math.sqrt(5));
  const ring = Math.sqrt(1 - y * y);
  return {
    site: orbitSites[t % orbitSites.length],
    x: ring * Math.cos(theta),
    y: y * 0.98,
    z: ring * Math.sin(theta),
    size: 0.72 + ((t * 13) % 17) / 28,
  };
});

export const restingAngle = 0.75;
export const orbitPeriodMs = ((2 * Math.PI) / 0.035) * 1000;

export function projectTile(tile: OrbitTile, angle: number): ProjectedTile {
  const x1 = tile.x * Math.cos(angle) + tile.z * Math.sin(angle);
  const z1 = -tile.x * Math.sin(angle) + tile.z * Math.cos(angle);
  const y2 = tile.y * Math.cos(tilt) - z1 * Math.sin(tilt);
  const z2 = tile.y * Math.sin(tilt) + z1 * Math.cos(tilt);
  const depth = (z2 + 1) / 2;
  const perspective = 2.7 / (2.7 - z2 * 0.88);
  const scale = (0.26 + depth * 0.8) * tile.size;
  return {
    x: 0.5 + x1 * radius * perspective,
    y: 0.5437 + y2 * radius * perspective - 0.25 / 2.88 + tileHeight / 2,
    width: tileWidth * scale,
    height: tileHeight * scale,
    opacity: 0.65 + depth * 0.35,
    brightness: 0.55 + depth * 0.45,
    order: Math.round(depth * 800),
  };
}
