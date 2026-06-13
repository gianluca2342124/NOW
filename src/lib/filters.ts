import type { EventCategory, NowEvent } from '@/types/event';
import { deriveStatus, isSameDay } from '@/lib/time';

export type TimeFilter = 'now' | 'tonight' | 'tomorrow';

export const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
];

const DAY = 24 * 60 * 60 * 1000;

/** Does an event pass the active time window? */
export function passesTimeFilter(
  event: NowEvent,
  filter: TimeFilter,
  now: number,
): boolean {
  const status = deriveStatus(event, now);
  if (status === null) return false; // already over

  const start = new Date(event.startsAt).getTime();

  switch (filter) {
    case 'now':
      // Happening right now or within the imminent window.
      return status === 'live' || status === 'ending' || status === 'imminent';
    case 'tonight':
      // Anything on today's calendar date that hasn't ended (incl. live).
      return status === 'live' || status === 'ending' || isSameDay(start, now);
    case 'tomorrow':
      return isSameDay(start, now + DAY);
    default:
      return true;
  }
}

/**
 * Apply the active time + category filters. Returns the set of visible event
 * ids — the map keeps every marker mounted and toggles bubble visibility, so
 * this never causes marker churn.
 */
export function visibleEventIds(
  events: NowEvent[],
  timeFilter: TimeFilter,
  activeCategories: ReadonlySet<EventCategory>,
  now: number,
): Set<string> {
  const ids = new Set<string>();
  for (const e of events) {
    if (!passesTimeFilter(e, timeFilter, now)) continue;
    if (activeCategories.size > 0 && !activeCategories.has(e.category)) continue;
    ids.add(e.id);
  }
  return ids;
}
