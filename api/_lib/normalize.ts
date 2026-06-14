import type { Activity, RawActivity, ServerSource } from './types';
import {
  ACTIVITY_LABEL_BY_CATEGORY,
  MOOD_BY_CATEGORY,
  SHORT_LABEL_BY_CATEGORY,
} from './categories';

/**
 * Raw → Activity. Where provenance becomes trust (mirrors the client's
 * src/ingestion/normalize.ts). Returns `null` for records we can't honestly or
 * usefully place (no coordinates, no valid start time).
 *
 * `verifiedLive` is never set here — real sources here are scheduled feeds, so
 * the app keeps making ZERO false live claims.
 */
export function normalize(
  raw: RawActivity,
  source: ServerSource,
  now: number,
): Activity | null {
  if (dropReason(raw, now)) return null;

  const lat = raw.coordinates.lat;
  const lng = raw.coordinates.lng;
  const start = Date.parse(raw.startsAt);
  const end = raw.endsAt ? Date.parse(raw.endsAt) : NaN;
  const endsAt = Number.isNaN(end) ? null : new Date(end).toISOString();

  // Rule 4: no sourceUrl ⇒ can't be "verified", downgrade to curated.
  let verificationStatus = source.verificationBaseline;
  if (verificationStatus === 'verified' && !raw.sourceUrl) {
    verificationStatus = 'curated';
  }

  const category = raw.category;

  return {
    id: `${source.id}:${raw.id}`,
    title: raw.title.trim(),
    activityLabel: ACTIVITY_LABEL_BY_CATEGORY[category],
    shortMapLabel: SHORT_LABEL_BY_CATEGORY[category],
    venueName: raw.venueName?.trim() || raw.title.trim(),
    neighborhood: raw.neighborhood?.trim() || 'Barcelona',
    category,
    mood: MOOD_BY_CATEGORY[category],
    coordinates: { lat, lng },
    startsAt: new Date(start).toISOString(),
    endsAt,
    sourceType: source.sourceType,
    sourceName: source.sourceName,
    sourceUrl: raw.sourceUrl,
    verificationStatus,
    verifiedLive: false,
    confidenceLevel: baselineConfidence(source.verificationBaseline),
    lastCheckedAt: new Date(now).toISOString(),
    importance: clamp01(raw.importance ?? 0.5),
    priceLabel: raw.priceLabel?.trim() || 'See source',
    description: raw.description?.trim() || `${raw.title.trim()} — via ${source.sourceName}.`,
    tags: raw.tags ?? [],
  };
}

/**
 * Why a raw record can't be turned into a usable Activity, or null if it's fine.
 * Exposed so /api/activities?debug=1 can report drop reasons.
 */
export function dropReason(raw: RawActivity, _now: number): string | null {
  const lat = raw.coordinates?.lat;
  const lng = raw.coordinates?.lng;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return 'no_coords';
  if (!withinBarcelona(lat, lng)) return 'outside_bcn';
  if (Number.isNaN(Date.parse(raw.startsAt))) return 'invalid_start';
  return null;
}

function baselineConfidence(status: ServerSource['verificationBaseline']): number {
  switch (status) {
    case 'official_source':
      return 0.85;
    case 'verified':
      return 0.8;
    case 'curated':
      return 0.6;
    case 'community_reported':
      return 0.4;
    default:
      return 0.3;
  }
}

function isFiniteCoord(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Loose bounding box around Barcelona to drop mis-geocoded records. */
function withinBarcelona(lat: number, lng: number): boolean {
  return lat > 41.2 && lat < 41.55 && lng > 1.95 && lng < 2.35;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
