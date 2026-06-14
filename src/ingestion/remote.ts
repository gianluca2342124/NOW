import type { Activity } from '@/types/activity';

interface ActivitiesResponse {
  activities?: unknown;
  fallback?: boolean;
  sources?: string[];
}

export interface RemoteResult {
  activities: Activity[];
  /** True when the response came from real sources (not the curated fallback). */
  live: boolean;
  sources: string[];
}

/**
 * Fetch the server feed from /api/activities. Returns parsed, lightly-validated
 * activities. Throws on network/HTTP failure so the caller can keep the curated
 * data it already has.
 */
export async function fetchRemoteActivities(
  signal?: AbortSignal,
): Promise<RemoteResult> {
  const res = await fetch('/api/activities', { signal });
  if (!res.ok) throw new Error(`/api/activities ${res.status}`);

  const json = (await res.json()) as ActivitiesResponse;
  const raw = Array.isArray(json.activities) ? json.activities : [];
  const activities = raw.filter(isValidActivity);

  return {
    activities,
    live: !json.fallback && activities.length > 0,
    sources: json.sources ?? [],
  };
}

function isValidActivity(value: unknown): value is Activity {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  const coords = a.coordinates as Record<string, unknown> | undefined;
  return (
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.startsAt === 'string' &&
    typeof a.category === 'string' &&
    !!coords &&
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number'
  );
}
