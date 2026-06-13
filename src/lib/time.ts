import type { EventStatus, NowEvent } from '@/types/event';

const MINUTE = 60 * 1000;

/**
 * Thresholds (in minutes) that define how a bubble feels over time.
 * - imminent: starts within the next 30 min
 * - live: currently running
 * - ending: live, but within the last 30 min before it ends
 */
const IMMINENT_WINDOW_MIN = 30;
const ENDING_WINDOW_MIN = 30;

/**
 * Derive an event's live status from the current time.
 * Returns `null` when the event is already over (so it can be filtered out).
 */
export function deriveStatus(event: NowEvent, now: number): EventStatus | null {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();

  if (now >= end) return null;

  if (now >= start) {
    const minutesLeft = (end - now) / MINUTE;
    return minutesLeft <= ENDING_WINDOW_MIN ? 'ending' : 'live';
  }

  const minutesUntilStart = (start - now) / MINUTE;
  return minutesUntilStart <= IMMINENT_WINDOW_MIN ? 'imminent' : 'upcoming';
}

/**
 * Human, glanceable time label for the bottom sheet.
 * e.g. "Live now · ends 23:30", "Starts in 12 min", "Tonight · 21:00".
 */
export function formatTimeLabel(event: NowEvent, now: number): string {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const status = deriveStatus(event, now);

  if (status === 'live' || status === 'ending') {
    return `Live now · ends ${formatClock(end)}`;
  }

  const minutesUntilStart = Math.round((start - now) / MINUTE);
  if (status === 'imminent') {
    if (minutesUntilStart <= 1) return 'Starting now';
    return `Starts in ${minutesUntilStart} min`;
  }

  // upcoming
  if (isSameDay(start, now)) {
    return minutesUntilStart < 120
      ? `Starts in ${minutesUntilStart} min`
      : `Tonight · ${formatClock(start)}`;
  }
  return `${formatDay(start)} · ${formatClock(start)}`;
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
