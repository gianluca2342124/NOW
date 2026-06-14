import type { Activity } from './_lib/types';
import { SERVER_SOURCES } from './_lib/sources/registry';
import { normalize, dropReason } from './_lib/normalize';
import { dedupeActivities } from './_lib/dedupe';
import { curatedFallback } from './_lib/curatedFallback';
import { loadBarcelonaOpenData } from './_lib/sources/barcelonaOpenData';
import { loadTicketmaster } from './_lib/sources/ticketmaster';
import { basePulse, isNowTab, isTonightTab, serverStatus } from './_lib/intelligence';

export const config = { runtime: 'edge' };

/** Mirrors the client's relevance-first map cap (Phase 3). */
const MAX_MAP_ACTIVITIES = 40;

function json(body: unknown, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl },
  });
}

interface Feed {
  activities: Activity[];
  sources: string[];
  fallback: boolean;
  /** A primary source (Barcelona Open Data) is missing — cache briefly so the
   * feed recovers fast instead of serving a thin TM-only response for 10 min. */
  degraded: boolean;
}

/** Run every enabled source → normalize → drop hidden → dedupe → sort. */
async function assembleFeed(now: number): Promise<Feed> {
  const sources = SERVER_SOURCES.filter((s) => s.isEnabled());
  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const raw = await source.fetch({ now });
      return raw
        .map((r) => normalize(r, source, now))
        .filter((a): a is Activity => a !== null && !a.hidden);
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
  const degraded = fallback || !contributing.includes('Barcelona Open Data');
  return { activities, sources: contributing, fallback, degraded };
}

function countBy<T extends string>(items: T[]): Record<string, number> {
  const d: Record<string, number> = {};
  for (const it of items) d[it] = (d[it] ?? 0) + 1;
  return d;
}

/** Phase 7 observability over the final feed. */
function intelligenceDebug(activities: Activity[], now: number) {
  const statuses = activities.map((a) => serverStatus(a, now));
  const pulses = activities.map((a) => basePulse(a, now));

  const pulseBuckets: Record<string, number> = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
  for (const p of pulses) {
    if (p < 20) pulseBuckets['0-20'] += 1;
    else if (p < 40) pulseBuckets['20-40'] += 1;
    else if (p < 60) pulseBuckets['40-60'] += 1;
    else if (p < 80) pulseBuckets['60-80'] += 1;
    else pulseBuckets['80-100'] += 1;
  }

  const topPulse = activities
    .map((a) => ({ a, pulse: basePulse(a, now) }))
    .sort((x, y) => y.pulse - x.pulse)
    .slice(0, 8)
    .map(({ a, pulse }) => ({
      title: a.title,
      category: a.category,
      pulse,
      status: serverStatus(a, now),
      source: a.sourceName,
      featured: !!a.featured,
    }));

  return {
    totalCount: activities.length,
    statusDistribution: countBy(statuses),
    pulseDistribution: pulseBuckets,
    topPulseActivities: topPulse,
    hiddenLowPulseCount: Math.max(0, activities.length - MAX_MAP_ACTIVITIES),
    nowFilterCount: activities.filter((a) => isNowTab(a, now)).length,
    tonightFilterCount: activities.filter((a) => isTonightTab(a, now)).length,
    featuredCount: activities.filter((a) => a.featured).length,
    // clusterCount depends on the client viewport/zoom and is computed there.
    clusterCount: null,
  };
}

async function buildDebug(now: number) {
  const [feed, { activities: raws, debug }, tm] = await Promise.all([
    assembleFeed(now),
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
    sources: feed.sources,
    fallback: feed.fallback,
    intelligence: intelligenceDebug(feed.activities, now),
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
      normalizedCount,
      droppedAtNormalize: raws.length - normalizedCount,
      normalizeDropReasons,
    },
  };
}

/**
 * GET /api/activities — real, trust-scored Barcelona activity feed.
 * Source keys (Ticketmaster etc.) live server-side only; never sent to client.
 */
export default async function handler(req: Request): Promise<Response> {
  const now = Date.now();

  if (new URL(req.url).searchParams.get('debug') === '1') {
    return json(await buildDebug(now), 'no-store');
  }

  const feed = await assembleFeed(now);
  const cache = feed.degraded
    ? 's-maxage=60, stale-while-revalidate=120'
    : 's-maxage=600, stale-while-revalidate=1200';
  return json(
    {
      generatedAt: new Date(now).toISOString(),
      sources: feed.sources,
      fallback: feed.fallback,
      degraded: feed.degraded,
      count: feed.activities.length,
      activities: feed.activities,
    },
    cache,
  );
}
