/**
 * Server-side geocoding + distance helpers (Mapbox).
 * Used by the scheduling-guardrail endpoint the voice agent calls before
 * confirming a booking.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

function token(): string {
  return process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
}

/** Geocode a free-text US address to a point. Returns null if unavailable. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; placeName: string } | null> {
  const t = token();
  if (!t || !address?.trim()) return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address.trim())}.json` +
    `?access_token=${t}&limit=1&country=us&types=address,place,postcode`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const f = data?.features?.[0];
    if (!f?.center) return null;
    const [lng, lat] = f.center as [number, number];
    return { lat, lng, placeName: f.place_name ?? address };
  } catch {
    return null;
  }
}

/** Great-circle distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
