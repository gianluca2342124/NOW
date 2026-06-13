/**
 * Core NOW domain types.
 *
 * An event's *status* is not stored — it is derived at render time from
 * `startsAt` / `endsAt` relative to the current clock (see lib/time.ts).
 * This is what lets the map feel alive: bubbles transition on their own.
 */

export type EventCategory =
  | 'nightlife'
  | 'music'
  | 'sports'
  | 'culture'
  | 'food'
  | 'civic';

export type EventStatus = 'upcoming' | 'imminent' | 'live' | 'ending';

export interface LngLat {
  lng: number;
  lat: number;
}

export interface NowEvent {
  id: string;
  title: string;
  venue: string;
  category: EventCategory;
  description: string;
  /** ISO 8601 start time. */
  startsAt: string;
  /** ISO 8601 end time. */
  endsAt: string;
  coordinates: LngLat;
}
