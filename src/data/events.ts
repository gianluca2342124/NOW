import type { NowEvent } from '@/types/event';

/**
 * Curated Barcelona events for the public demo.
 *
 * Times are computed relative to app load so that, whenever you open NOW, the
 * city looks alive: some events are live, some are starting soon, some are on
 * later tonight, and some are tomorrow. No backend, no ingestion — the shape
 * mirrors a future API response so this file can be swapped out cleanly.
 */
const MINUTE = 60 * 1000;

/** ISO string `offsetMinutes` from now. */
function at(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * MINUTE).toISOString();
}

/** ISO string for tomorrow at a fixed local hour:minute. */
function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const EVENTS: NowEvent[] = [
  // ---- LIVE right now ----
  {
    id: 'razzmatazz-main',
    title: 'Razzmatazz · The Loft',
    venue: 'Razzmatazz',
    category: 'nightlife',
    description:
      'Five rooms, one icon. Techno and indie until sunrise in Poblenou.',
    startsAt: at(-95),
    endsAt: at(220),
    coordinates: { lng: 2.1909, lat: 41.3979 },
    importance: 0.9,
    sourceUrl: 'https://www.salarazzmatazz.com',
  },
  {
    id: 'palau-musica-quartet',
    title: 'Candlelight String Quartet',
    venue: 'Palau de la Música Catalana',
    category: 'music',
    description:
      'A modernist jewel-box hall hosts Vivaldi by candlelight. Unmissable.',
    startsAt: at(-25),
    endsAt: at(70),
    coordinates: { lng: 2.1753, lat: 41.3875 },
    importance: 0.85,
    sourceUrl: 'https://www.palaumusica.cat',
  },
  {
    id: 'barca-laliga',
    title: 'FC Barcelona vs Sevilla',
    venue: 'Estadi Olímpic Lluís Companys',
    category: 'sports',
    description:
      'La Liga matchday under the Montjuïc lights. The whole city is watching.',
    startsAt: at(-35),
    endsAt: at(80),
    coordinates: { lng: 2.1556, lat: 41.3647 },
    importance: 0.98,
    sourceUrl: 'https://www.fcbarcelona.com',
  },
  {
    id: 'jamboree-jazz',
    title: 'Jamboree Jam Session',
    venue: 'Jamboree',
    category: 'music',
    description:
      'Late-night jazz in a Plaça Reial cellar. Standing room only by midnight.',
    startsAt: at(-40),
    endsAt: at(110),
    coordinates: { lng: 2.1749, lat: 41.3795 },
    importance: 0.7,
    sourceUrl: 'https://www.jamboreejazz.com',
  },

  // ---- ENDING soon (live, < 30 min left) ----
  {
    id: 'macba-late',
    title: 'MACBA Late: Night Galleries',
    venue: 'MACBA',
    category: 'culture',
    description:
      'After-hours access to the contemporary collection in the Raval.',
    startsAt: at(-150),
    endsAt: at(20),
    coordinates: { lng: 2.1664, lat: 41.3831 },
    importance: 0.65,
  },
  {
    id: 'boqueria-tasting',
    title: 'Late Market Tasting',
    venue: 'Mercat de la Boqueria',
    category: 'food',
    description:
      'Jamón, cava and seasonal bites along La Rambla before the stalls close.',
    startsAt: at(-175),
    endsAt: at(25),
    coordinates: { lng: 2.1716, lat: 41.3819 },
    importance: 0.6,
  },

  // ---- IMMINENT (starts within ~30 min) ----
  {
    id: 'apolo-nasty',
    title: 'Nasty Mondays',
    venue: 'Sala Apolo',
    category: 'nightlife',
    description:
      'The legendary indie-rock club night on Paral·lel. Doors about to open.',
    startsAt: at(16),
    endsAt: at(320),
    coordinates: { lng: 2.1686, lat: 41.3741 },
    importance: 0.8,
    sourceUrl: 'https://www.sala-apolo.com',
  },
  {
    id: 'sidecar-live',
    title: 'Sidecar Live: Indie Night',
    venue: 'Sidecar Factory Club',
    category: 'music',
    description:
      'Three emerging Barcelona bands back-to-back off Plaça Reial.',
    startsAt: at(24),
    endsAt: at(190),
    coordinates: { lng: 2.1751, lat: 41.3797 },
    importance: 0.55,
  },
  {
    id: 'ciutadella-run',
    title: 'Sunset Park Run',
    venue: 'Parc de la Ciutadella',
    category: 'sports',
    description:
      'Casual 5k meetup by the cascade fountain. All paces welcome.',
    startsAt: at(28),
    endsAt: at(95),
    coordinates: { lng: 2.1864, lat: 41.3886 },
    importance: 0.45,
  },

  // ---- UPCOMING later tonight ----
  {
    id: 'santa-caterina-supper',
    title: 'Market Supper Club',
    venue: 'Mercat de Santa Caterina',
    category: 'food',
    description:
      'A communal long-table dinner under the wave-tiled roof in El Born.',
    startsAt: at(80),
    endsAt: at(220),
    coordinates: { lng: 2.1764, lat: 41.3866 },
    importance: 0.6,
  },
  {
    id: 'gracia-assembly',
    title: 'Neighbourhood Assembly',
    venue: 'Plaça de la Vila de Gràcia',
    category: 'civic',
    description:
      'Open community meeting on the future of the Gràcia squares.',
    startsAt: at(95),
    endsAt: at(215),
    coordinates: { lng: 2.1565, lat: 41.4023 },
    importance: 0.5,
  },
  {
    id: 'filmoteca-screening',
    title: 'Filmoteca: Late Noir',
    venue: 'Filmoteca de Catalunya',
    category: 'culture',
    description:
      'A restored film-noir classic on the big screen in the Raval.',
    startsAt: at(120),
    endsAt: at(260),
    coordinates: { lng: 2.169, lat: 41.3793 },
    importance: 0.55,
  },
  {
    id: 'barceloneta-beach-set',
    title: 'Beachfront DJ Set',
    venue: 'Barceloneta Beach',
    category: 'nightlife',
    description:
      'Open-air session on the sand. Bring something warm for later.',
    startsAt: at(150),
    endsAt: at(380),
    coordinates: { lng: 2.1923, lat: 41.3784 },
    importance: 0.7,
  },
  {
    id: 'poble-espanyol-night',
    title: 'Poble Espanyol After Dark',
    venue: 'Poble Espanyol',
    category: 'culture',
    description:
      'Open-air courtyards, craft studios and live sets across the village.',
    startsAt: at(200),
    endsAt: at(400),
    coordinates: { lng: 2.147, lat: 41.3686 },
    importance: 0.6,
  },
  {
    id: 'rooftop-stargazing',
    title: 'Rooftop Stargazing',
    venue: 'Hotel Rooftop · Eixample',
    category: 'other',
    description:
      'Telescopes, vermut and the skyline. A quiet counterpoint to the night.',
    startsAt: at(175),
    endsAt: at(300),
    coordinates: { lng: 2.17, lat: 41.387 },
    importance: 0.5,
  },

  // ---- TOMORROW ----
  {
    id: 'sonar-day',
    title: 'Sónar by Day',
    venue: 'Fira Barcelona Montjuïc',
    category: 'music',
    description:
      'Daytime stages of the world-famous electronic & advanced music festival.',
    startsAt: tomorrowAt(16, 0),
    endsAt: tomorrowAt(23, 30),
    coordinates: { lng: 2.141, lat: 41.354 },
    importance: 0.95,
    sourceUrl: 'https://sonar.es',
  },
  {
    id: 'palau-blaugrana-basket',
    title: 'Barça Basket vs Madrid',
    venue: 'Palau Blaugrana',
    category: 'sports',
    description:
      'El Clásico on the hardwood. Euroleague intensity beside Camp Nou.',
    startsAt: tomorrowAt(12, 30),
    endsAt: tomorrowAt(14, 30),
    coordinates: { lng: 2.1228, lat: 41.3805 },
    importance: 0.75,
  },
  {
    id: 'palo-alto-market',
    title: 'Palo Alto Market',
    venue: 'Palo Alto · Poblenou',
    category: 'food',
    description:
      'Street food, makers and live music in a leafy old industrial yard.',
    startsAt: tomorrowAt(11, 0),
    endsAt: tomorrowAt(21, 0),
    coordinates: { lng: 2.1976, lat: 41.4006 },
    importance: 0.65,
  },
  {
    id: 'sant-jaume-gathering',
    title: 'Plaça Sant Jaume Gathering',
    venue: 'Plaça de Sant Jaume',
    category: 'civic',
    description:
      'A public square gathering in the Gothic heart of the city.',
    startsAt: tomorrowAt(19, 0),
    endsAt: tomorrowAt(21, 0),
    coordinates: { lng: 2.1774, lat: 41.3825 },
    importance: 0.6,
  },
];
