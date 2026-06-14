import type { Activity, DisplayStatus, TimeState } from '@/types/activity';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SOON_WINDOW_MIN = 120; // "Starting soon" = next 2 hours
const EVENING_HOUR = 18;
const NOW_TAB_TONIGHT_HOURS = 6;
/** A credible "happening now" window: short, event-like. */
const HAPPENING_MAX_HOURS = 6;
/** Anything ongoing longer than this reads as a run, not an event. */
const ONGOING_MIN_HOURS = 48;

const LIVE_ELIGIBLE: ReadonlySet<Activity['verificationStatus']> = new Set([
  'official_source',
  'verified',
]);

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function deriveTimeState(activity: Activity, now: number): TimeState {
  const start = Date.parse(activity.startsAt);
  const end = activity.endsAt ? Date.parse(activity.endsAt) : null;
  if (end !== null && now >= end) return 'ended';
  if (start > now) {
    const minsToStart = (start - now) / MINUTE;
    if (minsToStart <= SOON_WINDOW_MIN) return 'soon';
    if (isSameDay(start, now)) return 'today';
    if (isSameDay(start, now + DAY)) return 'tomorrow';
    return 'later';
  }
  if (end !== null) return 'ongoing';
  return 'today';
}

export function isLiveEligible(activity: Activity, now: number): boolean {
  if (!activity.verifiedLive) return false;
  if (!activity.endsAt) return false;
  if (!LIVE_ELIGIBLE.has(activity.verificationStatus)) return false;
  return deriveTimeState(activity, now) === 'ongoing';
}

/**
 * Status Engine V2.1 — honest "now" semantics.
 *
 * `happening_now` is reserved for genuinely-active short event windows.
 * Long all-day schedules become `open_today`, and multi-day runs become
 * `ongoing` — so a 24h municipal record never claims "Happening now · until
 * 05:00".
 */
export function deriveDisplayStatus(activity: Activity, now: number): DisplayStatus {
  if (activity.cancelled) return 'ended';

  const start = Date.parse(activity.startsAt);
  const end = activity.endsAt ? Date.parse(activity.endsAt) : null;

  if (end !== null && now >= end) return 'ended';
  if (isLiveEligible(activity, now)) return 'verified_live';

  // Currently within window.
  if (end !== null && start <= now && now < end) {
    const durationH = (end - start) / HOUR;
    if (durationH <= HAPPENING_MAX_HOURS) return 'happening_now';
    if (durationH >= ONGOING_MIN_HOURS) return 'ongoing';
    return 'open_today';
  }
  // Started, unknown end → treat as available today, not "happening".
  if (end === null && start <= now) {
    return isSameDay(start, now) ? 'open_today' : 'ongoing';
  }

  // Upcoming.
  const minsToStart = (start - now) / MINUTE;
  if (minsToStart <= SOON_WINDOW_MIN) return 'starting_soon';
  if (isSameDay(start, now)) {
    return new Date(start).getHours() >= EVENING_HOUR ? 'tonight' : 'today';
  }
  if (isSameDay(start, now + DAY)) return 'tomorrow';
  return 'upcoming';
}

export function isEnded(activity: Activity, now: number): boolean {
  return !!activity.cancelled || deriveDisplayStatus(activity, now) === 'ended';
}

/**
 * "Now" tab — only genuinely-now/soon activity. Deliberately EXCLUDES
 * open_today / ongoing (exhibitions) so Now isn't exhibition-dominated.
 */
export function isInNowTab(activity: Activity, now: number): boolean {
  const status = deriveDisplayStatus(activity, now);
  if (status === 'verified_live' || status === 'happening_now' || status === 'starting_soon') {
    return true;
  }
  if (status === 'tonight') {
    return Date.parse(activity.startsAt) - now <= NOW_TAB_TONIGHT_HOURS * HOUR;
  }
  return false;
}

/**
 * "Tonight" tab — everything on today incl. things open today; broader than Now
 * so the two feeds differ. Excludes long-running `ongoing` and future days.
 */
export function isTonightish(activity: Activity, now: number): boolean {
  const status = deriveDisplayStatus(activity, now);
  return (
    status === 'verified_live' ||
    status === 'happening_now' ||
    status === 'open_today' ||
    status === 'starting_soon' ||
    status === 'tonight' ||
    status === 'today'
  );
}
