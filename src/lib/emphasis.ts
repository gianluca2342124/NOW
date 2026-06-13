import type { Activity, LngLat } from '@/types/activity';
import { INTENSITY_BY_TIME_STATE } from '@/lib/categories';
import { deriveTimeState } from '@/lib/status';
import { computeConfidence } from '@/lib/confidence';
import { distanceKm } from '@/lib/geo';

/**
 * Visual emphasis 0..1 — drives bubble SIZE + stacking so the map reads as an
 * intentional hierarchy rather than chaos. This is a presentation aid, not a
 * user-facing ranking/score. Blends factual timeliness, proximity, editorial
 * importance and confidence (more trustworthy → slightly more prominent).
 */
const PROXIMITY_FALLOFF_KM = 4;

export function emphasisScore(
  activity: Activity,
  now: number,
  userLocation: LngLat | null,
): number {
  const timeliness = INTENSITY_BY_TIME_STATE[deriveTimeState(activity, now)];

  let proximity = 0.5; // neutral without a location
  if (userLocation) {
    const km = distanceKm(userLocation, activity.coordinates);
    proximity = Math.max(0, 1 - km / PROXIMITY_FALLOFF_KM);
  }

  const importance = clamp01(activity.importance);
  const confidence = computeConfidence(activity, now);

  return clamp01(
    0.4 * timeliness + 0.25 * proximity + 0.2 * importance + 0.15 * confidence,
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
