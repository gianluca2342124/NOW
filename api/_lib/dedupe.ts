import type { Activity, VerificationStatus } from './types';

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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function dedupeKey(a: Activity): string {
  const startHour = new Date(a.startsAt).toISOString().slice(0, 13);
  return `${slug(a.title)}|${slug(a.venueName)}|${startHour}`;
}

/** Collapse the same activity from multiple sources into the most trusted one. */
export function dedupeActivities(activities: Activity[]): Activity[] {
  const byKey = new Map<string, Activity>();
  for (const activity of activities) {
    const key = dedupeKey(activity);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, activity);
      continue;
    }
    const aRank = TRUST_RANK[activity.verificationStatus];
    const eRank = TRUST_RANK[existing.verificationStatus];
    byKey.set(key, aRank > eRank ? activity : existing);
  }
  return [...byKey.values()];
}
