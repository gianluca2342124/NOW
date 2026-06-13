/**
 * NOW domain model — Activity.
 *
 * Replaces the old `NowEvent`. The defining change in Phase 3 is the trust
 * layer: every activity carries provenance (`sourceType`/`sourceName`/
 * `sourceUrl`), a `verificationStatus`, a `confidenceLevel`, and a
 * `lastCheckedAt`. Live/`displayStatus` is DERIVED (see lib/status.ts) and can
 * only ever be `live_now` when the data explicitly justifies it.
 *
 * The shape mirrors a normalized ingestion record (see INGESTION_ARCHITECTURE)
 * so the curated local adapter and future networked adapters produce the same
 * type.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

export type EventCategory =
  | 'nightlife'
  | 'music'
  | 'sports'
  | 'culture'
  | 'food'
  | 'civic'
  | 'market'
  | 'exhibition'
  | 'other';

export type Mood =
  | 'energetic'
  | 'chill'
  | 'cultural'
  | 'social'
  | 'family'
  | 'late_night';

/** Where a record came from (independent of how much we trust it). */
export type SourceType =
  | 'official' // city open data, the venue, the promoter
  | 'ticketing' // Eventbrite, Ticketmaster, DICE…
  | 'listings' // Songkick, Bandsintown, RSS aggregators…
  | 'community' // user / community reported
  | 'curated'; // NOW editorial

/** How much we trust a record (see TRUST_MODEL.md). */
export type VerificationStatus =
  | 'official_source'
  | 'verified'
  | 'curated'
  | 'community_reported'
  | 'unknown';

/** What the user is shown. Derived, never stored. */
export type DisplayStatus =
  | 'live_now'
  | 'starting_soon'
  | 'tonight'
  | 'tomorrow'
  | 'ended'
  | 'unverified';

/** Factual time bucket, independent of trust. Derived. */
export type TimeState =
  | 'ongoing'
  | 'soon'
  | 'today'
  | 'tomorrow'
  | 'later'
  | 'ended';

export interface Activity {
  id: string;

  // --- Identity / presentation ---
  title: string;
  /** Human activity descriptor, e.g. "Live jazz", "DJ set", "Football". */
  activityLabel: string;
  /** Ultra-short label for the map, e.g. "JAZZ", "DJ", "FOOTBALL". */
  shortMapLabel: string;
  /** Optional micro caption, e.g. "On now", "Doors 23:00". */
  pulseLabel?: string;
  venueName: string;
  neighborhood: string;
  category: EventCategory;
  mood: Mood;
  coordinates: LngLat;

  // --- Time ---
  /** ISO 8601 start. */
  startsAt: string;
  /** ISO 8601 end, or null when unknown (then NOW can never claim live). */
  endsAt: string | null;

  // --- Provenance & trust ---
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  verificationStatus: VerificationStatus;
  /**
   * Explicit, deliberate assertion that this is genuinely happening live right
   * now. The ONLY path to a `live_now` label. Never inferred from timing.
   */
  verifiedLive?: boolean;
  /** Provider baseline confidence 0..1 (final score computed in lib/confidence). */
  confidenceLevel: number;
  /** ISO 8601 of the last time this record was checked against its source. */
  lastCheckedAt: string;
  /** Soft-cancel flag (e.g. from a source update). */
  cancelled?: boolean;

  // --- Editorial / extras ---
  importance: number; // 0..1
  priceLabel: string; // "Free", "From €15", "€€"
  description: string;
  tags: string[];
}

/** Merged source attribution carried by a deduplicated activity. */
export interface ActivitySource {
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
}
