import type { Activity } from './_lib/types';
import { SERVER_SOURCES } from './_lib/sources/registry';
import { normalize } from './_lib/normalize';
import { dedupeActivities } from './_lib/dedupe';
import { curatedFallback } from './_lib/curatedFallback';

export const config = { runtime: 'edge' };

/**
 * GET /api/activities
 *
 * Runs every enabled source in parallel (fault-tolerant), normalizes each into
 * the Activity shape, dedupes across sources, and returns a trust-scored feed.
 * Falls back to a small curated set ONLY when no real source yields data, so
 * the map is never empty and never lies.
 *
 * The Eventbrite/Ticketmaster/Songkick keys (when present) live server-side
 * only — they are never sent to the client.
 */
export default async function handler(_req: Request): Promise<Response> {
  const now = Date.now();
  const sources = SERVER_SOURCES.filter((s) => s.isEnabled());

  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const raw = await source.fetch({ now });
      return raw
        .map((r) => normalize(r, source, now))
        .filter((a): a is Activity => a !== null);
    }),
  );

  const collected: Activity[] = [];
  const contributing: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      collected.push(...result.value);
      contributing.push(sources[i].sourceName);
    }
  });

  let activities = dedupeActivities(collected).sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );

  let fallback = false;
  if (activities.length === 0) {
    activities = curatedFallback(now);
    fallback = true;
  }

  return new Response(
    JSON.stringify({
      generatedAt: new Date(now).toISOString(),
      sources: contributing,
      fallback,
      count: activities.length,
      activities,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Edge-cache for 10 min; serve stale for up to 20 while revalidating.
        'cache-control': 's-maxage=600, stale-while-revalidate=1200',
      },
    },
  );
}
