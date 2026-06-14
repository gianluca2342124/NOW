/**
 * Server-side activity types for /api/activities.
 *
 * Structurally identical to the client's `src/types/activity.ts`. Kept separate
 * so the serverless function bundles without depending on the React app's
 * module graph / path aliases. The two must stay in sync.
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

export type SourceType =
  | 'official'
  | 'ticketing'
  | 'listings'
  | 'community'
  | 'curated';

export type VerificationStatus =
  | 'official_source'
  | 'verified'
  | 'curated'
  | 'community_reported'
  | 'unknown';

export interface Activity {
  id: string;
  title: string;
  activityLabel: string;
  shortMapLabel: string;
  pulseLabel?: string;
  venueName: string;
  neighborhood: string;
  category: EventCategory;
  mood: Mood;
  coordinates: LngLat;
  startsAt: string;
  endsAt: string | null;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedLive?: boolean;
  confidenceLevel: number;
  lastCheckedAt: string;
  cancelled?: boolean;
  importance: number;
  priceLabel: string;
  description: string;
  tags: string[];
}

/** A loose record emitted by a source before normalization. */
export interface RawActivity {
  id: string;
  title: string;
  venueName?: string;
  neighborhood?: string;
  category: EventCategory;
  coordinates: LngLat;
  startsAt: string;
  endsAt?: string | null;
  sourceUrl?: string;
  description?: string;
  priceLabel?: string;
  importance?: number;
  tags?: string[];
}

export interface SourceContext {
  now: number;
}

/**
 * The generic server source contract. Adding a real source = implementing this
 * once and registering it (see api/_lib/sources/registry.ts).
 */
export interface ServerSource {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  /** Default trust this source confers (downgraded if no sourceUrl). */
  verificationBaseline: VerificationStatus;
  /** Whether this source is configured/enabled (e.g. has its env key). */
  isEnabled(): boolean;
  /** Must be fault-tolerant: a failing source must never break the feed. */
  fetch(ctx: SourceContext): Promise<RawActivity[]>;
}
