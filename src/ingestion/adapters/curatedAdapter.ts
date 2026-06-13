import { CURATED_ACTIVITIES } from '@/data/activities';
import type { RawActivity, SourceAdapter } from '../types';

/**
 * The curated adapter — NOW's own editorial dataset. Real, honest, local. It is
 * the only ACTIVE adapter today; networked adapters (Eventbrite, Bandsintown,
 * Barcelona Open Data…) implement this same contract once the serverless layer
 * exists (see INGESTION_ARCHITECTURE.md §6).
 */
export const curatedAdapter: SourceAdapter = {
  id: 'curated',
  sourceName: 'NOW curation',
  sourceType: 'curated',
  verificationBaseline: 'curated',
  async fetch(): Promise<RawActivity[]> {
    // Each record already carries its own (often stronger) source + status;
    // normalize() respects those and only fills gaps from the baseline.
    return CURATED_ACTIVITIES;
  },
};
