import type { Activity, VerificationStatus } from '@/types/activity';

/**
 * Confidence scoring — how sure NOW is that an activity is real and current.
 * Independent of the live gate (see TRUST_MODEL.md §5). Surfaced to users only
 * as a coarse High/Medium/Low label, never a raw number.
 */
const VERIFICATION_WEIGHT: Record<VerificationStatus, number> = {
  official_source: 1,
  verified: 0.85,
  curated: 0.6,
  community_reported: 0.4,
  unknown: 0.2,
};

const HOUR = 60 * 60 * 1000;

/** 1.0 within ~24h of last check, decaying toward ~0.2 over a week. */
function freshnessScore(lastCheckedAt: string, now: number): number {
  const ageHours = Math.max(0, (now - Date.parse(lastCheckedAt)) / HOUR);
  if (ageHours <= 24) return 1;
  if (ageHours >= 24 * 7) return 0.2;
  // Linear decay between 24h and 7d.
  return 1 - 0.8 * ((ageHours - 24) / (24 * 7 - 24));
}

export function computeConfidence(activity: Activity, now: number): number {
  const base = VERIFICATION_WEIGHT[activity.verificationStatus];
  const sourcePresence = activity.sourceUrl ? 1 : 0.6;
  const freshness = freshnessScore(activity.lastCheckedAt, now);
  const provided = clamp01(activity.confidenceLevel);

  return clamp01(
    0.4 * base + 0.2 * sourcePresence + 0.2 * freshness + 0.2 * provided,
  );
}

export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

export function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 0.75) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
