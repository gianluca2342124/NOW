import type { Activity, DisplayStatus, TimeState } from '@/types/activity';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** "Starting soon" window. */
const SOON_WINDOW_MIN = 60;

/** Verification levels permitted to back a real `live_now` claim. */
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

/**
 * Factual time bucket — independent of trust. Note: an activity that has
 * started but has NO `endsAt` is deliberately NOT "ongoing" (we can't know it
 * is still happening), so it can never become live.
 */
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

  // Started.
  if (end !== null) return 'ongoing';
  return 'today'; // started but unknown end → never "ongoing"/live
}

/**
 * Can this activity legitimately be shown as "Live now"? This is the ONLY
 * place a live claim is authorised. See TRUST_MODEL.md §3.
 */
export function isLiveEligible(activity: Activity, now: number): boolean {
  if (!activity.verifiedLive) return false; // must be explicitly asserted
  if (!activity.endsAt) return false; // rule: no end time → never live
  if (!LIVE_ELIGIBLE.has(activity.verificationStatus)) return false;
  return deriveTimeState(activity, now) === 'ongoing';
}

/**
 * What the user is shown. Derived from time + trust. `live_now` is gated behind
 * `isLiveEligible`; everything else degrades honestly.
 */
export function deriveDisplayStatus(
  activity: Activity,
  now: number,
): DisplayStatus {
  if (activity.cancelled) return 'ended';

  const timeState = deriveTimeState(activity, now);
  if (timeState === 'ended') return 'ended';

  if (activity.verificationStatus === 'unknown') return 'unverified';

  if (isLiveEligible(activity, now)) return 'live_now';

  switch (timeState) {
    case 'soon':
      return 'starting_soon';
    case 'ongoing':
    case 'today':
      return 'tonight'; // honest: on today / on now, never "live"
    case 'tomorrow':
    case 'later':
      return 'tomorrow';
    default:
      return 'unverified';
  }
}

/** Is this activity over (or cancelled)? Used to drop it from the Now view. */
export function isEnded(activity: Activity, now: number): boolean {
  return !!activity.cancelled || deriveTimeState(activity, now) === 'ended';
}
