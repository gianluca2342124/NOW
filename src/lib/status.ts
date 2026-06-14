import type { Activity, DisplayStatus, TimeState } from '@/types/activity';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Starting soon" = within the next 2 hours. */
const SOON_WINDOW_MIN = 120;
/** Evening starts at 18:00 local. */
const EVENING_HOUR = 18;
/** The "Now" tab also pulls in tonight events starting within 6 hours. */
const NOW_TAB_TONIGHT_HOURS = 6;

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

/** Verified-live gate — the only path to a "Live now" claim (TRUST_MODEL §3). */
export function isLiveEligible(activity: Activity, now: number): boolean {
  if (!activity.verifiedLive) return false;
  if (!activity.endsAt) return false;
  if (!LIVE_ELIGIBLE.has(activity.verificationStatus)) return false;
  return deriveTimeState(activity, now) === 'ongoing';
}

/**
 * Status Engine V2 — eight states. `verified_live` is reserved for verified
 * live data; `happening_now` is the honest "within its scheduled window" state
 * for everything else (never claimed as verified-live).
 */
export function deriveDisplayStatus(activity: Activity, now: number): DisplayStatus {
  if (activity.cancelled) return 'ended';

  const start = Date.parse(activity.startsAt);
  const end = activity.endsAt ? Date.parse(activity.endsAt) : null;

  if (end !== null && now >= end) return 'ended';
  if (isLiveEligible(activity, now)) return 'verified_live';
  if (end !== null && start <= now && now < end) return 'happening_now';

  if (start > now) {
    const minsToStart = (start - now) / MINUTE;
    if (minsToStart <= SOON_WINDOW_MIN) return 'starting_soon';
    if (isSameDay(start, now)) {
      return new Date(start).getHours() >= EVENING_HOUR ? 'tonight' : 'today';
    }
    if (isSameDay(start, now + DAY)) return 'tomorrow';
    return 'upcoming';
  }

  // Started, unknown end → bucket by today's evening.
  if (isSameDay(start, now)) {
    return new Date(start).getHours() >= EVENING_HOUR ? 'tonight' : 'today';
  }
  return 'upcoming';
}

export function isEnded(activity: Activity, now: number): boolean {
  return !!activity.cancelled || deriveDisplayStatus(activity, now) === 'ended';
}

/**
 * Whether an activity belongs in the "Now" tab: verified-live, happening now,
 * starting soon, or tonight within the next 6 hours.
 */
export function isInNowTab(activity: Activity, now: number): boolean {
  const status = deriveDisplayStatus(activity, now);
  if (status === 'verified_live' || status === 'happening_now' || status === 'starting_soon') {
    return true;
  }
  if (status === 'tonight') {
    const start = Date.parse(activity.startsAt);
    return start - now <= NOW_TAB_TONIGHT_HOURS * HOUR;
  }
  return false;
}

/** Tonight-ish set used for the empty-state fallback (Phase 6). */
export function isTonightish(activity: Activity, now: number): boolean {
  const status = deriveDisplayStatus(activity, now);
  return (
    status === 'verified_live' ||
    status === 'happening_now' ||
    status === 'starting_soon' ||
    status === 'tonight' ||
    status === 'today'
  );
}
