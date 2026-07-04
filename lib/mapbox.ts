/**
 * Mapbox helpers for the dispatch map. Expanded in Phase 6.
 */
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';

export interface LngLat {
  lng: number;
  lat: number;
}

/**
 * Estimate driving ETA (seconds) between two points via the Directions API.
 * Returns null when unavailable. Fully implemented in Phase 6.
 */
export async function getDrivingEta(_from: LngLat, _to: LngLat): Promise<number | null> {
  return null;
}
