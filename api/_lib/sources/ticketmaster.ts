import type { EventCategory, RawActivity, ServerSource } from '../types';
import { fetchJson } from '../http';

/**
 * Ticketmaster Discovery API — real Barcelona event search. Active only when
 * `TICKETMASTER_API_KEY` is set (server-side only; never sent to the client).
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
const ENDPOINT = 'https://app.ticketmaster.com/discovery/v2/events.json';
const WINDOW_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
}
interface TmClassification {
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
  type?: { name?: string };
  subType?: { name?: string };
}
interface TmEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
  };
  classifications?: TmClassification[];
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

interface TmSample {
  name: string;
  segment?: string;
  genre?: string;
  subGenre?: string;
  type?: string;
  subType?: string;
  venue?: string;
  start?: string;
  end?: string | null;
}

export interface TmDebug {
  enabled: boolean;
  httpOk: boolean;
  rawEventCount: number;
  parsedCount: number;
  beforeDedupCount: number;
  afterDedupCount: number;
  duplicateGroups: number;
  topRepeatedTitles: { title: string; sessions: number }[];
  segmentDistribution: Record<string, number>;
  postQualityCount: number;
  finalTicketmasterCount: number;
  dropReasons: Record<string, number>;
  categoryDistribution: Record<string, number>;
  sample: TmSample[];
}

const LABELS: Record<EventCategory, { label: string; short: string }> = {
  music: { label: 'Concert', short: 'MUSIC' },
  nightlife: { label: 'Club night', short: 'CLUB' },
  sports: { label: 'Sports', short: 'SPORT' },
  culture: { label: 'Live show', short: 'SHOW' },
  exhibition: { label: 'Exhibition', short: 'ART' },
  food: { label: 'Food', short: 'FOOD' },
  market: { label: 'Market', short: 'MARKET' },
  civic: { label: 'Civic', short: 'CIVIC' },
  other: { label: 'Event', short: 'NOW' },
};

/** All classification name fields across all classifications, lowercased. */
function classificationText(ev: TmEvent): string {
  return (ev.classifications ?? [])
    .flatMap((c) => [
      c.segment?.name,
      c.genre?.name,
      c.subGenre?.name,
      c.type?.name,
      c.subType?.name,
    ])
    .filter((s): s is string => !!s && s.toLowerCase() !== 'undefined')
    .join(' ')
    .toLowerCase();
}

/**
 * Robust category mapping. Ticketmaster often returns "Miscellaneous"/
 * "Undefined" segments, so we honour the segment when meaningful and otherwise
 * infer from genre/subGenre/type keywords.
 */
function tmCategory(ev: TmEvent): EventCategory {
  const segment = (ev.classifications?.[0]?.segment?.name ?? '').toLowerCase();
  const all = classificationText(ev);
  const has = (...words: string[]) => words.some((w) => all.includes(w));

  const nightlife = has(
    'electronic',
    'dance/electronic',
    'dance ',
    'club',
    'dj',
    'techno',
    'house',
    'party',
    'rave',
    'edm',
  );

  // 1) Meaningful segment first.
  if (segment.includes('music')) return nightlife ? 'nightlife' : 'music';
  if (segment.includes('sport')) return 'sports';
  if (segment.includes('art') || segment.includes('theat')) return 'culture';
  if (segment.includes('film')) return 'culture';

  // 2) Miscellaneous / Undefined / empty → infer from all classification text.
  if (has('food', 'wine', 'beer', 'gastro', 'tast', 'culinary')) return 'food';
  if (nightlife) return 'nightlife';
  if (
    has(
      'sport',
      'football',
      'soccer',
      'basket',
      'tennis',
      'running',
      'marathon',
      'cycling',
      'motor',
      'rugby',
      'hockey',
    )
  )
    return 'sports';
  if (
    has(
      'comedy',
      'theatre',
      'theater',
      'teatre',
      'musical',
      'opera',
      'ballet',
      'dance',
      'circus',
      'magic',
      'cabaret',
    )
  )
    return 'culture';
  if (has('exhibition', 'museum', 'art ', 'gallery')) return 'exhibition';
  if (has('festival', 'family', 'children', 'fair')) return 'culture';
  if (
    has(
      'concert',
      'music',
      'rock',
      'pop',
      'jazz',
      'indie',
      'metal',
      'hip-hop',
      'rap',
      'reggae',
      'flamenco',
      'classical',
      'folk',
      'blues',
      'soul',
      'latin',
    )
  )
    return 'music';
  return 'other';
}

function priceLabel(ev: TmEvent): string | undefined {
  const pr = ev.priceRanges?.[0];
  if (!pr || typeof pr.min !== 'number') return undefined;
  const sym = pr.currency === 'EUR' ? '€' : `${pr.currency ?? ''} `;
  return `From ${sym}${Math.round(pr.min)}`;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function fmtZ(ts: number): string {
  return new Date(ts).toISOString().slice(0, 19) + 'Z';
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Tourist "experiences"/attractions are not events — drop them. */
const JUNK_RE =
  /(experience|immersive|escape room|\battraction\b|\bexpo\b|hologram|360|interactiu|interactivo)/;

function isTouristJunk(name: string, allText: string): boolean {
  const s = `${name} ${allText}`.toLowerCase();
  return JUNK_RE.test(s);
}

/** Editorial quality per category for Ticketmaster's high-signal listings. */
function tmQuality(category: EventCategory, allText: string): number {
  if (/family|infantil|kids|children/.test(allText)) return 0.35; // penalise family
  switch (category) {
    case 'music':
      return 0.9;
    case 'sports':
      return 0.85;
    case 'nightlife':
      return 0.82;
    case 'culture':
      return 0.74;
    case 'food':
      return 0.62;
    case 'market':
      return 0.6;
    default:
      return 0.4;
  }
}

/** Stronger segments first; avoids the Miscellaneous/Family flood at the query. */
const SEGMENTS = ['Music', 'Sports', 'Arts & Theatre'];
const PER_SEGMENT_SIZE = 120;
/** Source-level cap so Ticketmaster enriches rather than floods the feed. */
const TM_MAX = 40;

async function fetchSegment(
  key: string,
  segment: string,
  now: number,
): Promise<TmEvent[]> {
  const url =
    `${ENDPOINT}?apikey=${encodeURIComponent(key)}` +
    `&city=Barcelona&countryCode=ES&size=${PER_SEGMENT_SIZE}&sort=date,asc&locale=*` +
    `&segmentName=${encodeURIComponent(segment)}` +
    `&startDateTime=${fmtZ(now)}&endDateTime=${fmtZ(now + WINDOW_DAYS * DAY)}`;
  const data = await fetchJson<TmResponse>(url, {}, 9000);
  return data?._embedded?.events ?? [];
}

interface TmParsed {
  ev: TmEvent;
  raw: RawActivity;
  key: string;
  startMs: number;
  sessions: number;
}

export async function loadTicketmaster(
  now: number,
): Promise<{ activities: RawActivity[]; debug: TmDebug }> {
  const debug: TmDebug = {
    enabled: !!process.env.TICKETMASTER_API_KEY,
    httpOk: false,
    rawEventCount: 0,
    parsedCount: 0,
    beforeDedupCount: 0,
    afterDedupCount: 0,
    duplicateGroups: 0,
    topRepeatedTitles: [],
    segmentDistribution: {},
    postQualityCount: 0,
    finalTicketmasterCount: 0,
    dropReasons: {},
    categoryDistribution: {},
    sample: [],
  };

  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return { activities: [], debug };

  // 1) Targeted queries per strong segment.
  const results = await Promise.allSettled(
    SEGMENTS.map((seg) => fetchSegment(key, seg, now)),
  );
  const events: TmEvent[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      debug.httpOk = true;
      events.push(...r.value);
    }
  }
  debug.rawEventCount = events.length;
  for (const ev of events) {
    bump(debug.segmentDistribution, ev.classifications?.[0]?.segment?.name ?? 'Undefined');
  }

  debug.sample = events.slice(0, 5).map((ev) => {
    const c = ev.classifications?.[0];
    return {
      name: ev.name,
      segment: c?.segment?.name,
      genre: c?.genre?.name,
      subGenre: c?.subGenre?.name,
      type: c?.type?.name,
      subType: c?.subType?.name,
      venue: ev._embedded?.venues?.[0]?.name,
      start: ev.dates?.start?.dateTime ?? ev.dates?.start?.localDate,
      end: ev.dates?.end?.dateTime ?? null,
    };
  });

  // 2) Parse.
  const parsed: TmParsed[] = [];
  for (const ev of events) {
    if (!ev.name) {
      bump(debug.dropReasons, 'no_title');
      continue;
    }
    const startIso =
      ev.dates?.start?.dateTime ??
      (ev.dates?.start?.localDate
        ? `${ev.dates.start.localDate}T${ev.dates.start.localTime ?? '20:00:00'}`
        : undefined);
    if (!startIso) {
      bump(debug.dropReasons, 'no_start');
      continue;
    }
    const venue = ev._embedded?.venues?.[0];
    const lat = Number(venue?.location?.latitude);
    const lng = Number(venue?.location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      bump(debug.dropReasons, 'no_coords');
      continue;
    }
    parsed.push({
      ev,
      raw: {
        id: ev.id,
        title: ev.name,
        venueName: venue?.name,
        neighborhood: venue?.city?.name ?? 'Barcelona',
        category: 'other',
        coordinates: { lat, lng },
        startsAt: startIso,
        endsAt: ev.dates?.end?.dateTime ?? null,
        sourceUrl: ev.url,
        description: ev.info,
        priceLabel: priceLabel(ev),
        tags: [],
      },
      key: `${slug(ev.name)}|${slug(venue?.name ?? '')}`,
      startMs: Date.parse(startIso),
      sessions: 1,
    });
  }
  debug.parsedCount = parsed.length;
  debug.beforeDedupCount = parsed.length;

  // 3) Collapse repeated sessions (same name+venue) → keep earliest upcoming.
  const byKey = new Map<string, TmParsed>();
  for (const p of parsed) {
    const existing = byKey.get(p.key);
    if (!existing) {
      byKey.set(p.key, { ...p });
    } else {
      existing.sessions += 1;
      if (p.startMs < existing.startMs) {
        existing.startMs = p.startMs;
        existing.raw.startsAt = p.raw.startsAt;
      }
    }
  }
  const deduped = [...byKey.values()];
  debug.afterDedupCount = deduped.length;
  const repeated = deduped
    .filter((p) => p.sessions > 1)
    .sort((a, b) => b.sessions - a.sessions);
  debug.duplicateGroups = repeated.length;
  debug.topRepeatedTitles = repeated
    .slice(0, 5)
    .map((p) => ({ title: p.raw.title, sessions: p.sessions }));

  // 4) Quality: classify, drop tourist-experience junk, score.
  interface Scored {
    raw: RawActivity;
    quality: number;
    startMs: number;
  }
  const scored: Scored[] = [];
  for (const p of deduped) {
    const allText = classificationText(p.ev);
    if (isTouristJunk(p.raw.title, allText)) {
      bump(debug.dropReasons, 'tourist_experience');
      continue;
    }
    const category = tmCategory(p.ev);
    const quality = tmQuality(category, allText);
    p.raw.category = category;
    p.raw.activityLabel = LABELS[category].label;
    p.raw.shortMapLabel = LABELS[category].short;
    p.raw.importance = quality;
    if (p.sessions > 1) p.raw.tags = ['multiple sessions'];
    scored.push({ raw: p.raw, quality, startMs: p.startMs });
  }
  debug.postQualityCount = scored.length;

  // 5) Rank by quality (then soonest) and cap Ticketmaster's contribution.
  scored.sort((a, b) => b.quality - a.quality || a.startMs - b.startMs);
  const out = scored.slice(0, TM_MAX).map((s) => s.raw);
  for (const a of out) bump(debug.categoryDistribution, a.category);
  debug.finalTicketmasterCount = out.length;

  return { activities: out, debug };
}

export const ticketmaster: ServerSource = {
  id: 'ticketmaster',
  sourceName: 'Ticketmaster',
  sourceType: 'ticketing',
  verificationBaseline: 'verified',
  isEnabled: () => !!process.env.TICKETMASTER_API_KEY,
  async fetch(ctx): Promise<RawActivity[]> {
    const { activities } = await loadTicketmaster(ctx.now);
    return activities;
  },
};
