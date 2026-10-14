import type { Ficha } from "../../../lib/turismo/types";

export type Spot = {
  lat: number;
  lng: number;
  exact: boolean;
  fichas: Ficha[];
};

/** Places that share a point (a town's center, when that is all the directory says) share one pin. */
export function spotsOf(fichas: Ficha[]): Spot[] {
  const spots = new Map<string, Spot>();
  for (const ficha of fichas) {
    const point = ficha.point;
    if (!point || point.precision === "department") continue;
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
    const spot = spots.get(key) ?? {
      lat: point.lat,
      lng: point.lng,
      exact: point.precision === "exact",
      fichas: [],
    };
    spot.fichas.push(ficha);
    spots.set(key, spot);
  }
  return [...spots.values()];
}

/** A map is worth drawing when it shows where things are relative to each other, or exactly where one is. */
export const worthMapping = (fichas: Ficha[]) => {
  const spots = spotsOf(fichas);
  return spots.length > 1 || spots.some((spot) => spot.exact);
};
