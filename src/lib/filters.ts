import type { Activity, EventCategory } from '@/types/activity';
import { deriveDisplayStatus, isInNowTab, isTonightish } from '@/lib/status';

export type TimeFilter = 'now' | 'tonight' | 'tomorrow';

export const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
];

/** Internal trust filter — not yet exposed in the UI (see TRUST_MODEL.md). */
export type TrustFilter = 'all' | 'verified_plus';

/** Time filtering via Status Engine V2 (see lib/status). */
export function passesTimeFilter(activity: Activity, filter: TimeFilter, now: number): boolean {
  switch (filter) {
    case 'now':
      return isInNowTab(activity, now);
    case 'tonight':
      return isTonightish(activity, now);
    case 'tomorrow':
      return deriveDisplayStatus(activity, now) === 'tomorrow';
    default:
      return true;
  }
}

export function passesTrustFilter(
  activity: Activity,
  filter: TrustFilter,
): boolean {
  if (filter === 'all') return true;
  return (
    activity.verificationStatus === 'official_source' ||
    activity.verificationStatus === 'verified'
  );
}

/**
 * Visible activity ids for the active filters. The map keeps every marker
 * mounted and toggles bubble visibility, so this never causes marker churn.
 */
export function visibleActivityIds(
  activities: Activity[],
  timeFilter: TimeFilter,
  activeCategories: ReadonlySet<EventCategory>,
  now: number,
  trustFilter: TrustFilter = 'all',
): Set<string> {
  const ids = new Set<string>();
  for (const a of activities) {
    if (!passesTimeFilter(a, timeFilter, now)) continue;
    if (activeCategories.size > 0 && !activeCategories.has(a.category)) continue;
    if (!passesTrustFilter(a, trustFilter)) continue;
    ids.add(a.id);
  }
  return ids;
}
