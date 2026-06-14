import type { RawActivity, ServerSource } from '../types';

/**
 * Bandsintown — prepared adapter (scaffold only).
 *
 * Bandsintown's public API is artist-centric (`/artists/:name/events`) and does
 * not expose a city-wide search for partners without special access. Until that
 * partnership/endpoint is available, this adapter stays disabled and returns
 * nothing, so it never affects the feed. The contract is in place so wiring a
 * real endpoint later is a one-file change.
 */
export const bandsintown: ServerSource = {
  id: 'bandsintown',
  sourceName: 'Bandsintown',
  sourceType: 'listings',
  verificationBaseline: 'verified',
  isEnabled: () => false, // no city-wide endpoint yet (see note above)
  async fetch(): Promise<RawActivity[]> {
    return [];
  },
};
