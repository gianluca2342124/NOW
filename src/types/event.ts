/**
 * Core NOW domain types.
 *
 * An event's *status* is not stored — it is derived at render time from
 * `startsAt` / `endsAt` relative to the current clock (see lib/time.ts).
 * This is what lets the map feel alive: bubbles transition on their own.
 *
 * The shape is intentionally flat and serialisable so it can later be replaced
 * by an API response with no changes to consumers.
 */

export type EventCategory =
  | 'nightlife'
  | 'music'
  | 'sports'
  | 'culture'
  | 'food'
  | 'civic'
  | 'other';

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
  /**
   * Editorial weight 0..1 — how much this event should "pull focus" on the
   * map, independent of timing/proximity. Optional; defaults to 0.5.
   */
  importance?: number;
  /** Optional external link surfaced as a small secondary "Source" action. */
  sourceUrl?: string;
}
