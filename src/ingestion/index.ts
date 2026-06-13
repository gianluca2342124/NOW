import type { Activity } from '@/types/activity';
import { CURATED_ACTIVITIES } from '@/data/activities';
import { curatedAdapter } from './adapters/curatedAdapter';
import { normalize } from './normalize';
import { dedupeActivities } from './dedupe';
import type { PlannedAdapter, SourceAdapter } from './types';

/** Adapters that run today. Add a networked adapter here to integrate a source. */
export const ACTIVE_ADAPTERS: SourceAdapter[] = [curatedAdapter];

/**
 * Sources we intend to integrate, blocked only by the serverless layer. Kept as
 * data so DATA_SOURCES.md and the roadmap stay honest about what's real.
 */
export const PLANNED_ADAPTERS: PlannedAdapter[] = [
  {
    id: 'barcelona-open-data',
    sourceName: 'Barcelona Open Data',
    sourceType: 'official',
    verificationBaseline: 'official_source',
    blockedBy: 'requires serverless fetch (CORS) + scheduled cache',
  },
  {
    id: 'eventbrite',
    sourceName: 'Eventbrite',
    sourceType: 'ticketing',
    verificationBaseline: 'verified',
    blockedBy: 'requires serverless proxy + API key',
  },
  {
    id: 'bandsintown',
    sourceName: 'Bandsintown',
    sourceType: 'listings',
    verificationBaseline: 'verified',
    blockedBy: 'requires serverless proxy + API key',
  },
];

function sortByStart(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}

/**
 * Run all active adapters → normalize → dedupe → sort. Async + fault-tolerant
 * by design so it can front real networked sources unchanged. A failing adapter
 * is skipped, never fatal.
 */
export async function loadActivities(now = Date.now()): Promise<Activity[]> {
  const results = await Promise.allSettled(
    ACTIVE_ADAPTERS.map(async (adapter) => {
      const raw = await adapter.fetch({ now });
      return raw.map((r) => normalize(r, adapter, now));
    }),
  );

  const all: Activity[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return sortByStart(dedupeActivities(all));
}

/**
 * Synchronous curated feed for instant, stable first paint (keeps Mapbox
 * markers churn-free). The curated source is local, so this needs no awaiting;
 * networked refresh is layered on top later via `loadActivities`.
 */
export function loadCuratedActivitiesSync(now = Date.now()): Activity[] {
  const normalized = CURATED_ACTIVITIES.map((r) =>
    normalize(r, curatedAdapter, now),
  );
  return sortByStart(dedupeActivities(normalized));
}
