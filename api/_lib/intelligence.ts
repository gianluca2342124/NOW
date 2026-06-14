import type { Activity, EventCategory, VerificationStatus } from './types';

/**
 * Server-side mirror of the client Status Engine V2 + Pulse Engine, used only
 * for /api/activities?debug=1 observability (the client computes the real pulse
 * because it has the user's distance). Kept in sync with src/lib/status.ts and
 * src/lib/pulse.ts.
 */
export type ServerStatus =
  | 'verified_live'
  | 'happening_now'
  | 'open_today'
  | 'ongoing'
  | 'starting_soon'
  | 'tonight'
  | 'today'
  | 'tomorrow'
  | 'upcoming'
  | 'ended';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SOON_MIN = 120;
const EVENING_HOUR = 18;

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function serverStatus(a: Activity, now: number): ServerStatus {
  if (a.cancelled) return 'ended';
  const start = Date.parse(a.startsAt);
  const end = a.endsAt ? Date.parse(a.endsAt) : null;
  if (end !== null && now >= end) return 'ended';

  const liveEligible =
    a.verifiedLive &&
    a.endsAt &&
    (a.verificationStatus === 'official_source' || a.verificationStatus === 'verified');
  if (liveEligible && end !== null && start <= now && now < end) return 'verified_live';

  if (end !== null && start <= now && now < end) {
    const durH = (end - start) / HOUR;
    if (durH <= 6) return 'happening_now';
    if (durH >= 48) return 'ongoing';
    return 'open_today';
  }
  if (end === null && start <= now) return sameDay(start, now) ? 'open_today' : 'ongoing';

  if (start > now) {
    const mins = (start - now) / MINUTE;
    if (mins <= SOON_MIN) return 'starting_soon';
    if (sameDay(start, now)) return new Date(start).getHours() >= EVENING_HOUR ? 'tonight' : 'today';
    if (sameDay(start, now + DAY)) return 'tomorrow';
    return 'upcoming';
  }
  return 'upcoming';
}

export function isNowTab(a: Activity, now: number): boolean {
  const s = serverStatus(a, now);
  if (s === 'verified_live' || s === 'happening_now' || s === 'starting_soon') return true;
  if (s === 'tonight') return Date.parse(a.startsAt) - now <= 6 * HOUR;
  return false;
}

export function isTonightTab(a: Activity, now: number): boolean {
  const s = serverStatus(a, now);
  return (
    s === 'verified_live' ||
    s === 'happening_now' ||
    s === 'open_today' ||
    s === 'starting_soon' ||
    s === 'tonight' ||
    s === 'today'
  );
}

const TRUST: Record<VerificationStatus, number> = {
  official_source: 1,
  verified: 0.92,
  curated: 0.6,
  community_reported: 0.4,
  unknown: 0.2,
};
const CAT: Record<EventCategory, number> = {
  music: 1,
  nightlife: 1,
  sports: 0.95,
  culture: 0.8,
  food: 0.8,
  market: 0.7,
  exhibition: 0.32,
  civic: 0.25,
  other: 0.3,
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function timeRel(a: Activity, now: number): number {
  const start = Date.parse(a.startsAt);
  const end = a.endsAt ? Date.parse(a.endsAt) : null;
  if (end !== null && now >= end) return 0;
  if (start <= now) {
    const dur = end && end > start ? end - start : 0;
    if (dur > 90 * DAY) return 0.18;
    if (dur > 30 * DAY) return 0.3;
    if (dur > 7 * DAY) return 0.5;
    return 0.85;
  }
  const hours = (start - now) / HOUR;
  if (hours <= 2) return 1;
  if (hours <= 6) return 0.9;
  if (hours <= 24) return 0.75;
  if (hours <= 48) return 0.6;
  if (hours <= 24 * 7) return 0.45;
  return 0.3;
}

/** Base pulse 0..100 without distance (proximity neutral). */
export function basePulse(a: Activity, now: number): number {
  const ticketed = a.sourceType === 'ticketing' ? 1 : 0;
  const oneOff =
    a.endsAt && Date.parse(a.endsAt) - Date.parse(a.startsAt) <= 28 * HOUR ? 1 : 0;
  const base =
    0.3 * timeRel(a, now) +
    0.17 * 0.5 +
    0.13 * TRUST[a.verificationStatus] +
    0.14 * CAT[a.category] +
    0.12 * clamp01(a.importance) +
    0.07 * ticketed +
    0.07 * oneOff;
  let score = 100 * clamp01(base);
  if (a.featured) score += 28;
  if (a.promoted) score += 8;
  if (a.manualImportance) score += a.manualImportance * 20;
  return Math.round(Math.min(100, Math.max(0, score)));
}
