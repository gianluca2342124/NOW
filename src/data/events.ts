import type { NowEvent } from '@/types/event';

/**
 * Hardcoded Barcelona events for the visual prototype.
 *
 * Times are computed as offsets from app load (in minutes) so that, whenever
 * you open the prototype, every bubble *state* is represented on the map:
 * live, ending, imminent and upcoming. No backend, no ingestion — by design.
 */
const MINUTE = 60 * 1000;

function at(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * MINUTE).toISOString();
}

export const EVENTS: NowEvent[] = [
  {
    id: 'razzmatazz-night',
    title: 'Razzmatazz · Main Room',
    venue: 'Razzmatazz',
    category: 'nightlife',
    description:
      'Five rooms, one icon. Techno and indie until sunrise in Poblenou.',
    startsAt: at(-60), // started an hour ago → live
    endsAt: at(240),
    coordinates: { lng: 2.1909, lat: 41.3979 },
  },
  {
    id: 'palau-musica-recital',
    title: 'Evening Recital',
    venue: 'Palau de la Música Catalana',
    category: 'music',
    description:
      'A modernist jewel-box concert hall hosts a candlelit string quartet.',
    startsAt: at(-15), // just started → live
    endsAt: at(75),
    coordinates: { lng: 2.1753, lat: 41.3875 },
  },
  {
    id: 'macba-late',
    title: 'MACBA Late: Night Galleries',
    venue: 'MACBA',
    category: 'culture',
    description:
      'After-hours access to contemporary collections in the Raval.',
    startsAt: at(-110), // ends soon → ending
    endsAt: at(20),
    coordinates: { lng: 2.1664, lat: 41.3831 },
  },
  {
    id: 'boqueria-tasting',
    title: 'Late Market Tasting',
    venue: 'Mercat de la Boqueria',
    category: 'food',
    description:
      'Jamón, cava and seasonal bites along La Rambla before the stalls close.',
    startsAt: at(-90), // ends soon → ending
    endsAt: at(25),
    coordinates: { lng: 2.1716, lat: 41.3819 },
  },
  {
    id: 'apolo-live',
    title: 'Nasty Mondays',
    venue: 'Sala Apolo',
    category: 'music',
    description:
      'The legendary indie-rock club night on Paral·lel. Doors are about to open.',
    startsAt: at(18), // soon → imminent
    endsAt: at(300),
    coordinates: { lng: 2.1686, lat: 41.3741 },
  },
  {
    id: 'ciutadella-run',
    title: 'Sunset Park Run',
    venue: 'Parc de la Ciutadella',
    category: 'sports',
    description:
      'Casual 5k meetup by the cascade fountain. All paces welcome.',
    startsAt: at(25), // soon → imminent
    endsAt: at(90),
    coordinates: { lng: 2.1864, lat: 41.3886 },
  },
  {
    id: 'gracia-assembly',
    title: 'Neighbourhood Assembly',
    venue: "Plaça de la Vila de Gràcia",
    category: 'civic',
    description:
      'Open community meeting on the future of the Gràcia squares.',
    startsAt: at(95), // later tonight → upcoming
    endsAt: at(215),
    coordinates: { lng: 2.1565, lat: 41.4023 },
  },
  {
    id: 'barceloneta-beach-set',
    title: 'Beachfront DJ Set',
    venue: 'Barceloneta Beach',
    category: 'nightlife',
    description:
      'Open-air sundown session on the sand. Bring something warm for later.',
    startsAt: at(140), // later tonight → upcoming
    endsAt: at(380),
    coordinates: { lng: 2.1923, lat: 41.3784 },
  },
];
