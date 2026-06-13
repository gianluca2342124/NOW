import type { LngLat, NowEvent } from '@/types/event';
import { STATUS_CONFIG } from '@/lib/categories';
import { deriveStatus } from '@/lib/time';
import { distanceKm } from '@/lib/geo';

/**
 * Relevance scoring — drives bubble *size* hierarchy so the map reads as
 * intentional, not chaotic. Score is a blend of:
 *   - live status    (is it happening now?)
 *   - proximity      (is it near me?)
 *   - importance     (editorial weight)
 *   - starting-soon  (a nudge for imminent events)
 *
 * Animation *intensity* stays status-led elsewhere (lib/bubble) so "live"
 * always feels alive regardless of distance — relevance only scales size.
 */
const WEIGHTS = {
  status: 0.45,
  proximity: 0.3,
  importance: 0.2,
  startingSoon: 0.05,
} as const;

/** Distance (km) at which proximity contribution fades to ~0. */
const PROXIMITY_FALLOFF_KM = 4;

export function relevanceScore(
  event: NowEvent,
  now: number,
  userLocation: LngLat | null,
): number {
  const status = deriveStatus(event, now);
  if (status === null) return 0;

  const statusScore = STATUS_CONFIG[status].intensity;

  // Proximity: 1 when on top of the user, decaying with distance. Neutral
  // (0.5) when we have no location so distance never penalises the hierarchy.
  let proximityScore = 0.5;
  if (userLocation) {
    const km = distanceKm(userLocation, event.coordinates);
    proximityScore = Math.max(0, 1 - km / PROXIMITY_FALLOFF_KM);
  }

  const importanceScore = event.importance ?? 0.5;
  const startingSoonScore = status === 'imminent' ? 1 : 0;

  return clamp01(
    WEIGHTS.status * statusScore +
      WEIGHTS.proximity * proximityScore +
      WEIGHTS.importance * importanceScore +
      WEIGHTS.startingSoon * startingSoonScore,
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
