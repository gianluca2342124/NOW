import { useEffect, useState } from 'react';
import type { Activity } from '@/types/activity';
import { loadCuratedActivitiesSync } from '@/ingestion';
import { fetchRemoteActivities } from '@/ingestion/remote';

export interface ActivitiesState {
  activities: Activity[];
  /** True once real source data (not curated) has hydrated in. */
  live: boolean;
}

/**
 * Activity feed for the app.
 *
 * 1. First paint: curated data, loaded synchronously → instant AND a stable
 *    array reference (no Mapbox marker churn).
 * 2. Hydrate: fetch /api/activities once. Replace the feed ONLY when the remote
 *    response is genuinely live and non-empty. On empty / malformed / failed
 *    responses we KEEP the curated feed — never collapse a populated map to
 *    nothing (safety rule).
 */
export function useActivities(): ActivitiesState {
  const [state, setState] = useState<ActivitiesState>(() => {
    const curated = loadCuratedActivitiesSync();
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[NOW useActivities] curated first paint', { curatedCount: curated.length });
    }
    return { activities: curated, live: false };
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchRemoteActivities(controller.signal)
      .then((result) => {
        if (!active) return;
        const healthy = result.live && result.activities.length > 0;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[NOW useActivities] remote', {
            live: result.live,
            remoteCount: result.activities.length,
            sources: result.sources,
            healthy,
          });
        }
        // Safety rule: never replace a non-empty feed with an empty/unhealthy
        // remote feed.
        if (healthy) {
          setState({ activities: result.activities, live: true });
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[NOW useActivities] remote failed — keeping curated', err);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
