import type { ServerSource } from '../types';
import { barcelonaOpenData } from './barcelonaOpenData';
import { ticketmaster } from './ticketmaster';
import { songkick } from './songkick';
import { bandsintown } from './bandsintown';

/**
 * All known sources, in priority order. Real Barcelona coverage first; keyed
 * platforms are prepared and activate only when their env keys are present.
 */
export const SERVER_SOURCES: ServerSource[] = [
  barcelonaOpenData, // official, no key — the real core
  ticketmaster, // key-gated (TICKETMASTER_API_KEY)
  songkick, // key-gated (SONGKICK_API_KEY)
  bandsintown, // prepared scaffold, disabled
];
