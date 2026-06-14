import type { Activity } from './_lib/types';
import { SERVER_SOURCES } from './_lib/sources/registry';
import { normalize, dropReason } from './_lib/normalize';
import { dedupeActivities } from './_lib/dedupe';
import { curatedFallback } from './_lib/curatedFallback';
import { loadBarcelonaOpenData } from './_lib/sources/barcelonaOpenData';
import { loadTicketmaster } from './_lib/sources/ticketmaster';

export const config = { runtime: 'edge' };

function json(body: unknown, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl },
  });
}

/** Temporary diagnostics for /api/activities?debug=1. */
async function buildDebug(now: number) {
  const [{ activities: raws, debug }, tm] = await Promise.all([
    loadBarcelonaOpenData(now),
    loadTicketmaster(now),
  ]);
  const normalizeDropReasons: Record<string, number> = {};
  let normalizedCount = 0;
  for (const raw of raws) {
    const reason = dropReason(raw, now);
    if (reason) normalizeDropReasons[reason] = (normalizeDropReasons[reason] ?? 0) + 1;
    else normalizedCount += 1;
  }
  return {
    generatedAt: new Date(now).toISOString(),
    ticketmaster: tm.debug,
    barcelonaOpenData: {
      datasetIdsAttempted: debug.datasetIdsAttempted,
      packageShow: debug.packageShow,
      selectedResourceId: debug.selectedResourceId,
      datastoreQueryMethod: debug.queryMethod,
      datastoreOk: debug.datastoreOk,
      rawRecordCount: debug.rawRecordCount,
      afterRegisterDedupe: debug.afterRegisterDedupe,
      sampleRecordKeys: debug.sampleRecordKeys,
      afterParse: debug.afterParse,
      afterNameDedupe: debug.afterNameDedupe,
      finalCount: debug.finalCount,
      dropReasons: debug.dropReasons,
      preBalanceDistribution: debug.preBalanceDistribution,
      postBalanceDistribution: debug.postBalanceDistribution,
      categoryCaps: debug.categoryCaps,
      maxShare: debug.maxShare,
      categoryDistribution: debug.categoryDistribution,
      // normalize stage (bbox/date validity on the final set)
      normalizedCount,
      droppedAtNormalize: raws.length - normalizedCount,
      normalizeDropReasons,
    },
  };
}

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
export default async function handler(req: Request): Promise<Response> {
  const now = Date.now();

  if (new URL(req.url).searchParams.get('debug') === '1') {
    return json(await buildDebug(now), 'no-store');
  }

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
