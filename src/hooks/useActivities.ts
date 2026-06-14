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
 * 2. Hydrate: fetch /api/activities once. If it returns real source data, swap
 *    the array a single time (markers re-create once, never per tick). On any
 *    failure, the curated data simply stays.
 */
export function useActivities(): ActivitiesState {
  const [state, setState] = useState<ActivitiesState>(() => ({
    activities: loadCuratedActivitiesSync(),
    live: false,
  }));

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchRemoteActivities(controller.signal)
      .then((result) => {
        if (active && result.live && result.activities.length > 0) {
          setState({ activities: result.activities, live: true });
        }
      })
      .catch(() => {
        /* keep curated data */
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
