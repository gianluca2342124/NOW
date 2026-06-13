import type { Activity, VerificationStatus } from '@/types/activity';

/**
 * Deduplicate activities arriving from multiple sources. The same gig listed by
 * three sources collapses into one record carrying the highest trust and merged
 * attribution (see INGESTION_ARCHITECTURE.md §5).
 */
const TRUST_RANK: Record<VerificationStatus, number> = {
  official_source: 5,
  verified: 4,
  curated: 3,
  community_reported: 2,
  unknown: 1,
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '');
}

function dedupeKey(a: Activity): string {
  const startHour = new Date(a.startsAt).toISOString().slice(0, 13); // hour bucket
  return `${slug(a.title)}|${slug(a.venueName)}|${startHour}`;
}

export function dedupeActivities(activities: Activity[]): Activity[] {
  const byKey = new Map<string, Activity>();

  for (const activity of activities) {
    const key = dedupeKey(activity);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, activity);
      continue;
    }
    // Keep the more trustworthy record; prefer the fresher check on ties.
    const activityRank = TRUST_RANK[activity.verificationStatus];
    const existingRank = TRUST_RANK[existing.verificationStatus];
    const better =
      activityRank > existingRank ||
      (activityRank === existingRank &&
        Date.parse(activity.lastCheckedAt) > Date.parse(existing.lastCheckedAt))
        ? activity
        : existing;
    byKey.set(key, better);
  }

  return [...byKey.values()];
}
