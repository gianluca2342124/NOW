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

export async function loadTicketmaster(
  now: number,
): Promise<{ activities: RawActivity[]; debug: TmDebug }> {
  const debug: TmDebug = {
    enabled: !!process.env.TICKETMASTER_API_KEY,
    httpOk: false,
    rawEventCount: 0,
    parsedCount: 0,
    dropReasons: {},
    categoryDistribution: {},
    sample: [],
  };

  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return { activities: [], debug };

  const url =
    `${ENDPOINT}?apikey=${encodeURIComponent(key)}` +
    `&city=Barcelona&countryCode=ES&size=199&sort=date,asc&locale=*` +
    `&startDateTime=${fmtZ(now)}&endDateTime=${fmtZ(now + WINDOW_DAYS * DAY)}`;

  const data = await fetchJson<TmResponse>(url, {}, 9000);
  if (!data) return { activities: [], debug };
  debug.httpOk = true;

  const events = data._embedded?.events ?? [];
  debug.rawEventCount = events.length;

  // Diagnostic sample: first 5 events' raw classification + venue + dates.
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

  const out: RawActivity[] = [];
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

    const category = tmCategory(ev);
    bump(debug.categoryDistribution, category);
    out.push({
      id: ev.id,
      title: ev.name,
      venueName: venue?.name,
      neighborhood: venue?.city?.name ?? 'Barcelona',
      category,
      activityLabel: LABELS[category].label,
      shortMapLabel: LABELS[category].short,
      coordinates: { lat, lng },
      startsAt: startIso,
      endsAt: ev.dates?.end?.dateTime ?? null,
      sourceUrl: ev.url,
      description: ev.info,
      priceLabel: priceLabel(ev),
      importance: 0.78,
    });
  }
  debug.parsedCount = out.length;
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
