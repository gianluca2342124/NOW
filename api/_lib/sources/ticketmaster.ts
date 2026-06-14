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
interface TmEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
  };
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

export interface TmDebug {
  enabled: boolean;
  httpOk: boolean;
  rawEventCount: number;
  parsedCount: number;
  dropReasons: Record<string, number>;
  categoryDistribution: Record<string, number>;
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

function tmCategory(ev: TmEvent): EventCategory {
  const c = ev.classifications?.[0];
  const segment = c?.segment?.name ?? '';
  const genre = c?.genre?.name ?? '';
  switch (segment) {
    case 'Music':
      return /electron|dance|house|techno|club|dj/i.test(genre)
        ? 'nightlife'
        : 'music';
    case 'Sports':
      return 'sports';
    case 'Arts & Theatre':
    case 'Film':
      return 'culture';
    default:
      return 'other';
  }
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
