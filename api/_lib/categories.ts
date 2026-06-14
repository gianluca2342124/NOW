import type { EventCategory, Mood } from './types';

/** Default presentation derived per category when a source doesn't provide it. */
export const ACTIVITY_LABEL_BY_CATEGORY: Record<EventCategory, string> = {
  nightlife: 'Nightlife',
  music: 'Live music',
  sports: 'Sports',
  culture: 'Culture',
  food: 'Food',
  civic: 'Civic',
  market: 'Market',
  exhibition: 'Exhibition',
  other: 'Happening',
};

export const SHORT_LABEL_BY_CATEGORY: Record<EventCategory, string> = {
  nightlife: 'CLUB',
  music: 'MUSIC',
  sports: 'SPORT',
  culture: 'CULTURE',
  food: 'FOOD',
  civic: 'CIVIC',
  market: 'MARKET',
  exhibition: 'ART',
  other: 'NOW',
};

export const MOOD_BY_CATEGORY: Record<EventCategory, Mood> = {
  nightlife: 'late_night',
  music: 'energetic',
  sports: 'energetic',
  culture: 'cultural',
  food: 'social',
  civic: 'social',
  market: 'family',
  exhibition: 'cultural',
  other: 'chill',
};

/** Map a free-text category/keyword (Catalan/Spanish/English) → our enum. */
export function mapTextToCategory(input: string | undefined): EventCategory {
  if (!input) return 'other';
  const s = input.toLowerCase();
  const has = (...words: string[]) => words.some((w) => s.includes(w));

  if (has('nit', 'club', 'discoteca', 'dj', 'night', 'festa', 'party'))
    return 'nightlife';
  if (has('concert', 'música', 'musica', 'music', 'live', 'gig', 'jazz', 'rock'))
    return 'music';
  if (has('esport', 'sport', 'futbol', 'football', 'basquet', 'basket', 'run', 'marató'))
    return 'sports';
  if (has('exposició', 'exposicio', 'exhibition', 'museu', 'museum', 'galeria', 'art'))
    return 'exhibition';
  if (has('mercat', 'market', 'fira', 'fair'))
    return 'market';
  if (has('gastro', 'food', 'menjar', 'cuina', 'tast', 'vermut', 'restaurant'))
    return 'food';
  if (has('assemblea', 'manifest', 'protesta', 'civic', 'comunitat', 'veïn', 'barri', 'public'))
    return 'civic';
  if (
    has(
      'teatre',
      'theatre',
      'theater',
      'cinema',
      'film',
      'dansa',
      'dance',
      'cultura',
      'culture',
      'taller',
      'xerrada',
      'talk',
      'literatura',
    )
  )
    return 'culture';
  return 'other';
}

/** Map a Ticketmaster classification segment → our enum. */
export function mapTicketmasterSegment(segment: string | undefined): EventCategory {
  switch ((segment ?? '').toLowerCase()) {
    case 'music':
      return 'music';
    case 'sports':
      return 'sports';
    case 'arts & theatre':
      return 'culture';
    default:
      return 'other';
  }
}
