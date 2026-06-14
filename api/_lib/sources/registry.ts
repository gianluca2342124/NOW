import type { ServerSource } from '../types';
import { manualFeatured } from './manualFeatured';
import { barcelonaOpenData } from './barcelonaOpenData';
import { ticketmaster } from './ticketmaster';
import { songkick } from './songkick';
import { bandsintown } from './bandsintown';

/**
 * All known sources, in priority order. Manual editorial featured first, then
 * real ticketed coverage, then the open-data civic background. Keyed platforms
 * activate only when their env keys are present.
 */
export const SERVER_SOURCES: ServerSource[] = [
  manualFeatured, // editorial high-value, always on
  ticketmaster, // key-gated (TICKETMASTER_API_KEY)
  barcelonaOpenData, // official, no key — civic background coverage
  songkick, // key-gated (SONGKICK_API_KEY)
  bandsintown, // prepared scaffold, disabled
];
