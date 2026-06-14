import type { Activity, ActivityType } from './types';

/**
 * Product intelligence for the relevance-first feed: internal activity type,
 * a 0-100 productScore, and human short descriptions. Server-side (no distance)
 * — the client adds proximity on top of productScore.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function asciiLower(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/·/g, '')
    .toLowerCase();
}

/** Derive the internal activity taxonomy from category + name keywords. */
export function classifyActivityType(a: Activity): ActivityType {
  const s = asciiLower(`${a.title} ${a.tags?.join(' ') ?? ''}`);
  const has = (...w: string[]) => w.some((x) => s.includes(x));

  if (has('experience', 'immersive', 'attraction', 'tour ', 'guided tour')) return 'tourist_attraction';
  if (has('family', 'infantil', 'nens', 'kids', 'children', 'titelles', 'conte')) return 'family';

  switch (a.category) {
    case 'nightlife':
      return 'club_night';
    case 'music':
      if (has('festival', 'sonar', 'primavera')) return 'festival';
      if (has('dj', 'club', 'techno', 'house', 'electronic')) return 'club_night';
      return 'concert';
    case 'sports':
      return 'sports_match';
    case 'market':
      return 'market';
    case 'food':
      return 'food_event';
    case 'exhibition':
      return 'exhibition';
    case 'civic':
      return has('assemblea', 'manifest', 'protesta') ? 'civic' : 'meetup';
    case 'culture':
      if (has('festival')) return 'festival';
      if (has('teatre', 'theatre', 'espectacle', 'opera', 'dansa', 'musical')) return 'theatre';
      if (has('xerrada', 'taller', 'meetup', 'trobada', 'conferencia')) return 'meetup';
      return 'other';
    default:
      return 'other';
  }
}

const TYPE_WEIGHT: Record<ActivityType, number> = {
  festival: 0.98,
  concert: 0.95,
  club_night: 0.95,
  sports_match: 0.92,
  theatre: 0.8,
  food_event: 0.78,
  market: 0.72,
  meetup: 0.6,
  civic: 0.5,
  exhibition: 0.4,
  other: 0.42,
  family: 0.28,
  tourist_attraction: 0.2,
};

function durationH(a: Activity): number {
  if (!a.endsAt) return 0;
  const d = Date.parse(a.endsAt) - Date.parse(a.startsAt);
  return d > 0 ? d / HOUR : 0;
}

/** Precise = has a real time of day, not the all-day placeholder (~03:00). */
function isPrecise(a: Activity): boolean {
  const d = new Date(Date.parse(a.startsAt));
  const hm = d.getUTCHours() * 60 + d.getUTCMinutes();
  return hm !== 3 * 60 && hm !== 0;
}

function isGenericVenue(a: Activity): boolean {
  const v = (a.venueName ?? '').trim().toLowerCase();
  return v === '' || v === a.title.trim().toLowerCase() || v === 'barcelona';
}

/** Product score 0-100 — the relevance-first quality metric. */
export function productScore(a: Activity, now: number): number {
  const type = a.activityType ?? classifyActivityType(a);
  let score = 60 * TYPE_WEIGHT[type];

  const start = Date.parse(a.startsAt);
  const hoursToStart = (start - now) / HOUR;
  const dur = durationH(a);

  if (a.sourceType === 'ticketing') score += 8;
  if (start > now && hoursToStart <= 6) score += 10;
  else if (start > now && hoursToStart <= 24) score += 5;
  if (isPrecise(a)) score += 6;
  else score -= 6;
  if (!isGenericVenue(a)) score += 4;
  if (a.sourceUrl) score += 6;
  else score -= 6;

  // Penalise long-running exhibitions / runs.
  if (dur > 30 * 24) score -= 22;
  else if (dur > 7 * 24) score -= 10;

  if (type === 'exhibition' && dur > 7 * 24) score -= 6;

  if (a.featured) score += 32;
  if (a.promoted) score += 8;
  if (typeof a.manualImportance === 'number') score += a.manualImportance * 16;

  return Math.round(Math.min(100, Math.max(0, score)));
}

const TYPE_WORD: Record<ActivityType, string> = {
  concert: 'Concert',
  club_night: 'Club night',
  theatre: 'Theatre',
  sports_match: 'Match',
  exhibition: 'Exhibition',
  food_event: 'Food',
  market: 'Market',
  festival: 'Festival',
  meetup: 'Meetup',
  civic: 'Community event',
  family: 'Family activity',
  tourist_attraction: 'Experience',
  other: 'Activity',
};

/** Human short description from type + time + venue (replaces "via X" noise). */
export function describe(a: Activity, now: number): string {
  const type = a.activityType ?? classifyActivityType(a);
  const word = TYPE_WORD[type];
  const start = Date.parse(a.startsAt);
  const end = a.endsAt ? Date.parse(a.endsAt) : null;

  let when: string;
  if (end && start <= now && now < end) {
    when = type === 'exhibition' ? 'open today' : 'on now';
  } else if (start > now) {
    const h = (start - now) / HOUR;
    if (h <= 2) when = 'starting soon';
    else if (sameDay(start, now)) when = new Date(start).getHours() >= 18 ? 'tonight' : 'today';
    else if (sameDay(start, now + DAY)) when = 'tomorrow';
    else when = 'coming up';
  } else {
    when = 'today';
  }

  const venue = isGenericVenue(a) ? a.neighborhood : a.venueName;
  return venue && venue !== 'Barcelona' ? `${word} ${when} at ${venue}.` : `${word} ${when} in ${a.neighborhood}.`;
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
