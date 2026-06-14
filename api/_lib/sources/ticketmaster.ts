import type { RawActivity, ServerSource } from '../types';
import { mapTicketmasterSegment } from '../categories';
import { fetchJson } from '../http';

/**
 * Ticketmaster Discovery API — real city-wide search. Prepared adapter; active
 * only when `TICKETMASTER_API_KEY` is set, otherwise skipped gracefully.
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */
const ENDPOINT = 'https://app.ticketmaster.com/discovery/v2/events.json';

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
}
interface TmEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  dates?: { start?: { dateTime?: string } };
  classifications?: { segment?: { name?: string } }[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

export const ticketmaster: ServerSource = {
  id: 'ticketmaster',
  sourceName: 'Ticketmaster',
  sourceType: 'ticketing',
  verificationBaseline: 'verified',
  isEnabled: () => !!process.env.TICKETMASTER_API_KEY,
  async fetch(): Promise<RawActivity[]> {
    const key = process.env.TICKETMASTER_API_KEY;
    if (!key) return [];

    const url =
      `${ENDPOINT}?apikey=${encodeURIComponent(key)}` +
      `&city=Barcelona&countryCode=ES&size=100&sort=date,asc`;
    const data = await fetchJson<TmResponse>(url);
    const events = data?._embedded?.events ?? [];

    const out: RawActivity[] = [];
    for (const ev of events) {
      const startsAt = ev.dates?.start?.dateTime;
      const venue = ev._embedded?.venues?.[0];
      const lat = Number(venue?.location?.latitude);
      const lng = Number(venue?.location?.longitude);
      if (!startsAt || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      out.push({
        id: ev.id,
        title: ev.name,
        venueName: venue?.name,
        neighborhood: venue?.city?.name,
        category: mapTicketmasterSegment(ev.classifications?.[0]?.segment?.name),
        coordinates: { lat, lng },
        startsAt,
        sourceUrl: ev.url,
        description: ev.info,
        importance: 0.7,
      });
    }
    return out;
  },
};
