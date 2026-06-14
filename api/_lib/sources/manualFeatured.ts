import type { RawActivity, ServerSource } from '../types';
import { manualFeaturedRaw } from '../manualFeaturedActivities';

/**
 * Manual featured source — NOW's editorial high-value Barcelona activities.
 * Honestly curated (not verified-live); featured + high manualImportance lift
 * them to the top of the feed above public-data noise.
 */
export const manualFeatured: ServerSource = {
  id: 'manual',
  sourceName: 'NOW Featured',
  sourceType: 'curated',
  verificationBaseline: 'curated',
  isEnabled: () => true,
  async fetch(ctx): Promise<RawActivity[]> {
    return manualFeaturedRaw(ctx.now);
  },
};
