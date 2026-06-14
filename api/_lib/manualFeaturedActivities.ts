import type { ActivityType, EventCategory, RawActivity } from './types';

/**
 * Manual featured Barcelona activities — the editorial override that keeps the
 * feed feeling alive ("Barcelona is alive") above public-data noise. Add the
 * city's real high-value happenings here (club nights, gigs, matches, pop-ups).
 *
 * These are `featured` with high `manualImportance`, so productScore lifts them
 * near the top. They are honestly CURATED — `verifiedLive` stays false.
 *
 * Times are computed relative to "now" so recurring nightlife stays relevant.
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface Seed {
  id: string;
  title: string;
  venue: string;
  neighborhood: string;
  lng: number;
  lat: number;
  category: EventCategory;
  activityType: ActivityType;
  sourceUrl?: string;
  priceLabel: string;
  manualImportance: number;
  description: string;
  /** Day offset from today (0 = today). */
  dayOffset: number;
  startHour: number;
  durationHours: number;
}

const SEEDS: Seed[] = [
  {
    id: 'razzmatazz-club',
    title: 'Razzmatazz Club Night',
    venue: 'Razzmatazz',
    neighborhood: 'Poblenou',
    lng: 2.1909,
    lat: 41.3979,
    category: 'nightlife',
    activityType: 'club_night',
    sourceUrl: 'https://www.salarazzmatazz.com',
    priceLabel: 'From €18',
    manualImportance: 0.9,
    description: 'Five rooms of techno and indie until sunrise.',
    dayOffset: 0,
    startHour: 23,
    durationHours: 6,
  },
  {
    id: 'apolo-party',
    title: 'Sala Apolo · Nitsa',
    venue: 'Sala Apolo',
    neighborhood: 'Poble-sec',
    lng: 2.1686,
    lat: 41.3741,
    category: 'nightlife',
    activityType: 'club_night',
    sourceUrl: 'https://www.sala-apolo.com',
    priceLabel: 'From €15',
    manualImportance: 0.85,
    description: 'Legendary club night on Paral·lel.',
    dayOffset: 0,
    startHour: 24,
    durationHours: 6,
  },
  {
    id: 'shoko-friday',
    title: 'Shoko Friday Night',
    venue: 'Shôko',
    neighborhood: 'Port Olímpic',
    lng: 2.1972,
    lat: 41.3855,
    category: 'nightlife',
    activityType: 'club_night',
    sourceUrl: 'https://shoko.biz',
    priceLabel: 'From €20',
    manualImportance: 0.8,
    description: 'Beachfront club night by the Port Olímpic.',
    dayOffset: 0,
    startHour: 24,
    durationHours: 5,
  },
  {
    id: 'jamboree-jazz',
    title: 'Jamboree Live Jazz',
    venue: 'Jamboree',
    neighborhood: 'Plaça Reial · Gòtic',
    lng: 2.1749,
    lat: 41.3795,
    category: 'music',
    activityType: 'concert',
    sourceUrl: 'https://www.jamboreejazz.com',
    priceLabel: 'From €12',
    manualImportance: 0.82,
    description: 'Late-night jazz in a Plaça Reial cellar.',
    dayOffset: 0,
    startHour: 20,
    durationHours: 3,
  },
  {
    id: 'marula-funk',
    title: 'Marula Café · Funk & Soul',
    venue: 'Marula Café',
    neighborhood: 'Gòtic',
    lng: 2.1773,
    lat: 41.3805,
    category: 'nightlife',
    activityType: 'club_night',
    sourceUrl: 'https://marulacafe.com',
    priceLabel: 'From €10',
    manualImportance: 0.7,
    description: 'Funk, soul and disco in the Gothic Quarter.',
    dayOffset: 0,
    startHour: 23,
    durationHours: 5,
  },
  {
    id: 'fcb-match',
    title: 'FC Barcelona Matchday',
    venue: 'Estadi Olímpic Lluís Companys',
    neighborhood: 'Montjuïc',
    lng: 2.1556,
    lat: 41.3647,
    category: 'sports',
    activityType: 'sports_match',
    sourceUrl: 'https://www.fcbarcelona.com',
    priceLabel: 'From €39',
    manualImportance: 0.95,
    description: 'Barça under the Montjuïc lights.',
    dayOffset: 1,
    startHour: 18,
    durationHours: 2,
  },
  {
    id: 'born-food-popup',
    title: 'El Born Food Pop-up',
    venue: 'Mercat del Born area',
    neighborhood: 'El Born',
    lng: 2.1832,
    lat: 41.3853,
    category: 'food',
    activityType: 'food_event',
    priceLabel: '€€',
    manualImportance: 0.6,
    description: 'Rotating chefs and natural wine in El Born.',
    dayOffset: 0,
    startHour: 19,
    durationHours: 4,
  },
];

function buildTimes(now: number, seed: Seed): { startsAt: string; endsAt: string } {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  let start = d.getTime() + seed.dayOffset * DAY + seed.startHour * HOUR;
  // If a "today" slot already finished, roll it to the same time tomorrow.
  if (seed.dayOffset === 0 && start + seed.durationHours * HOUR < now) {
    start += DAY;
  }
  return {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + seed.durationHours * HOUR).toISOString(),
  };
}

export function manualFeaturedRaw(now: number): RawActivity[] {
  return SEEDS.map((seed) => {
    const { startsAt, endsAt } = buildTimes(now, seed);
    return {
      id: seed.id,
      title: seed.title,
      venueName: seed.venue,
      neighborhood: seed.neighborhood,
      category: seed.category,
      activityType: seed.activityType,
      coordinates: { lng: seed.lng, lat: seed.lat },
      startsAt,
      endsAt,
      sourceUrl: seed.sourceUrl,
      description: seed.description,
      priceLabel: seed.priceLabel,
      featured: true,
      manualImportance: seed.manualImportance,
      tags: [seed.activityType],
    };
  });
}
