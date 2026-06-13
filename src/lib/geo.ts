import type { LngLat } from '@/types/event';

/** Approximate centre of Barcelona — the map's default home. */
export const BARCELONA_CENTER: LngLat = { lng: 2.1734, lat: 41.3851 };

/** Haversine distance in kilometres between two coordinates. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Friendly distance label, e.g. "450 m away" / "1.2 km away". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

/**
 * Google Maps directions deep link to a coordinate.
 * Works as a web URL and is intercepted by the Google Maps app on mobile.
 */
export function googleMapsDirectionsUrl(dest: LngLat): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=walking`;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
