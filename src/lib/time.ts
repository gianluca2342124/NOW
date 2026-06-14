import type { Activity } from '@/types/activity';
import { deriveDisplayStatus } from '@/lib/status';

const MINUTE = 60 * 1000;

/**
 * Honest, factual schedule label for the bottom sheet. Deliberately states the
 * *schedule* (times), never an unverified live claim — the StatusPill +
 * verification badge own the trust framing.
 */
export function formatScheduleLabel(activity: Activity, now: number): string {
  const start = Date.parse(activity.startsAt);
  const end = activity.endsAt ? Date.parse(activity.endsAt) : null;
  const status = deriveDisplayStatus(activity, now);

  if (status === 'starting_soon') {
    const mins = Math.max(1, Math.round((start - now) / MINUTE));
    return `Starts in ${mins} min · ${formatClock(start)}`;
  }
  // Honest "now" labels — no misleading "until 05:00" for all-day records.
  if (status === 'happening_now' && end !== null) {
    return `Happening now · until ${formatClock(end)}`;
  }
  if (status === 'open_today') return 'Open today';
  if (status === 'ongoing') {
    return end !== null ? `Ongoing · until ${formatDay(end)}` : 'Ongoing';
  }

  const prefix = dayPrefix(start, now);
  const range = end !== null ? `${formatClock(start)}–${formatClock(end)}` : formatClock(start);
  return `${prefix} · ${range}`;
}

/** Relative "checked" freshness, e.g. "Checked 12 min ago". */
export function formatCheckedAt(iso: string, now: number): string {
  const checked = Date.parse(iso);
  const mins = Math.round((now - checked) / MINUTE);
  if (mins < 1) return 'Checked just now';
  if (mins < 60) return `Checked ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Checked ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Checked ${days}d ago`;
}

function dayPrefix(start: number, now: number): string {
  const day = 24 * 60 * MINUTE;
  if (isSameDay(start, now)) return 'Today';
  if (isSameDay(start, now + day)) return 'Tomorrow';
  return formatDay(start);
}

export function formatClock(ts: number): string {
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
