import type { RawActivity, ServerSource } from '../types';
import { fetchJson } from '../http';

/**
 * Songkick — concerts by metro area. Prepared adapter; active only when
 * `SONGKICK_API_KEY` is set. Barcelona metro id defaults to 28714.
 * Docs: https://www.songkick.com/developer
 */
const BARCELONA_METRO_ID = '28714';

interface SkResponse {
  resultsPage?: { results?: { event?: SkEvent[] } };
}
interface SkEvent {
  id: number;
  displayName: string;
  uri?: string;
  start?: { datetime?: string; date?: string };
  venue?: {
    displayName?: string;
    lat?: number;
    lng?: number;
    metroArea?: { displayName?: string };
  };
}

export const songkick: ServerSource = {
  id: 'songkick',
  sourceName: 'Songkick',
  sourceType: 'listings',
  verificationBaseline: 'verified',
  isEnabled: () => !!process.env.SONGKICK_API_KEY,
  async fetch(): Promise<RawActivity[]> {
    const key = process.env.SONGKICK_API_KEY;
    if (!key) return [];
    const metroId = process.env.SONGKICK_METRO_ID?.trim() || BARCELONA_METRO_ID;

    const url =
      `https://api.songkick.com/api/3.0/metro_areas/${metroId}/calendar.json` +
      `?apikey=${encodeURIComponent(key)}`;
    const data = await fetchJson<SkResponse>(url);
    const events = data?.resultsPage?.results?.event ?? [];

    const out: RawActivity[] = [];
    for (const ev of events) {
      const startsAt = ev.start?.datetime ?? ev.start?.date;
      const lat = ev.venue?.lat;
      const lng = ev.venue?.lng;
      if (!startsAt || typeof lat !== 'number' || typeof lng !== 'number') continue;

      out.push({
        id: String(ev.id),
        title: ev.displayName,
        venueName: ev.venue?.displayName,
        neighborhood: ev.venue?.metroArea?.displayName,
        category: 'music',
        coordinates: { lat, lng },
        startsAt,
        sourceUrl: ev.uri,
        importance: 0.65,
      });
    }
    return out;
  },
};
