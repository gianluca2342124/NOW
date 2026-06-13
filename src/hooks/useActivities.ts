import { useState } from 'react';
import type { Activity } from '@/types/activity';
import { loadCuratedActivitiesSync } from '@/ingestion';

/**
 * Provides the activity feed to the app. Initialised synchronously from the
 * curated adapter so the first paint is instant AND the array reference is
 * stable for the lifetime of the session (no Mapbox marker churn).
 *
 * When the networked ingestion layer lands, this hook gains a background
 * refresh against `loadActivities()` / `/api/activities` without changing its
 * contract.
 */
export function useActivities(): Activity[] {
  const [activities] = useState<Activity[]>(() => loadCuratedActivitiesSync());
  return activities;
}
