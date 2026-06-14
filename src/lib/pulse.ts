import type { Activity, EventCategory, LngLat, VerificationStatus } from '@/types/activity';
import { deriveTimeState } from '@/lib/status';
import { distanceKm } from '@/lib/geo';

/**
 * The Pulse Engine — every activity gets a pulseScore 0..100 that is the
 * primary ranking signal across NOW (map prominence, top-N selection,
 * empty-state fallback). Computed client-side because it depends on the user's
 * live distance.
 */

const VERIFICATION_TRUST: Record<VerificationStatus, number> = {
  official_source: 1,
  verified: 0.92,
  curated: 0.6,
  community_reported: 0.4,
  unknown: 0.2,
};

/** How much each category "pulls focus" in a city map. */
const CATEGORY_WEIGHT: Record<EventCategory, number> = {
  music: 1,
  nightlife: 1,
  sports: 0.95,
  culture: 0.8, // theatre/film/festival live here and are lifted via importance
  food: 0.8,
  market: 0.7,
  exhibition: 0.32,
  civic: 0.25,
  other: 0.3,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PROXIMITY_FALLOFF_KM = 4;
const FEATURED_BOOST = 28;
const PROMOTED_BOOST = 8;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Time relevance 0..1 — now/soon/tonight high; long-running/old penalised. */
function timeRelevance(activity: Activity, now: number): number {
  const start = Date.parse(activity.startsAt);
  const end = activity.endsAt ? Date.parse(activity.endsAt) : null;
  const ts = deriveTimeState(activity, now);
  if (ts === 'ended') return 0;

  if (start <= now) {
    const duration = end && end > start ? end - start : 0;
    if (duration > 90 * DAY) return 0.18;
    if (duration > 30 * DAY) return 0.3;
    if (duration > 7 * DAY) return 0.5;
    return 0.85; // genuinely on now, short
  }
  const hours = (start - now) / HOUR;
  if (hours <= 2) return 1;
  if (hours <= 6) return 0.9;
  if (hours <= 24) return 0.75;
  if (hours <= 48) return 0.6;
  if (hours <= 24 * 7) return 0.45;
  return 0.3;
}

function proximityScore(activity: Activity, userLocation: LngLat | null): number {
  if (!userLocation) return 0.5; // neutral without a location
  const km = distanceKm(userLocation, activity.coordinates);
  if (!Number.isFinite(km)) return 0.5; // guard against NaN coords
  return Math.max(0, 1 - km / PROXIMITY_FALLOFF_KM);
}

function oneOffScore(activity: Activity): number {
  if (!activity.endsAt) return 0;
  const d = Date.parse(activity.endsAt) - Date.parse(activity.startsAt);
  return d > 0 && d <= 28 * HOUR ? 1 : 0;
}

/**
 * Compute pulse 0..100 — the on-map ranking signal.
 *
 * When the server has provided a `productScore` (the relevance-first quality
 * metric), that is the base and the client only adds a small proximity bonus so
 * nearer activities rise. Otherwise (offline curated) it falls back to a local
 * blend. Featured/promoted/manualImportance remain additive hooks.
 */
export function pulseScore(activity: Activity, now: number, userLocation: LngLat | null): number {
  const proximity = proximityScore(activity, userLocation);

  let score: number;
  if (typeof activity.productScore === 'number') {
    // productScore already bakes in time/type/ticketed/featured/etc.
    score = activity.productScore + (userLocation ? proximity * 12 : 0);
  } else {
    const base =
      0.3 * timeRelevance(activity, now) +
      0.17 * proximity +
      0.13 * VERIFICATION_TRUST[activity.verificationStatus] +
      0.14 * CATEGORY_WEIGHT[activity.category] +
      0.12 * clamp01(activity.importance) +
      0.07 * (activity.sourceType === 'ticketing' ? 1 : 0) +
      0.07 * oneOffScore(activity);
    score = 100 * clamp01(base);
    if (activity.featured) score += FEATURED_BOOST;
    if (activity.promoted) score += PROMOTED_BOOST;
    if (activity.manualImportance) score += activity.manualImportance * 20;
  }

  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.min(100, Math.max(0, score)));
}
