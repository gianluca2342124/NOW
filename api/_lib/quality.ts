import type { EventCategory } from './types';

/**
 * Classification + quality for Barcelona Open Data (agenda-diaria).
 *
 * The dataset's structured category fields are empty, so type is inferred from
 * the (Catalan) event name. This also fixes prior misclassification — e.g.
 * "Festa major" was matching a naive "festa" → nightlife rule.
 */
export interface Classification {
  category: EventCategory;
  /** Editorial quality 0..1 — how "worth surfacing" this type is. */
  quality: number;
  /** Human activity label (overrides the generic category label). */
  label: string;
  /** Short map label. */
  shortLabel: string;
  /** Clear low-value noise to drop (school yards, info points, etc.). */
  drop: boolean;
}

function asciiLower(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/·/g, '')
    .toLowerCase();
}

/** Low-value / repetitive records to remove entirely. */
const DROP_PATTERNS = [
  'patis escolar',
  'pati escolar',
  'pati obert',
  'espai de trobada',
  'punt de trobada',
  "punt d'informaci",
  "punt d'atenci",
  'banc del temps',
];

interface Rule {
  keys: string[];
  category: EventCategory;
  quality: number;
  label: string;
  shortLabel: string;
}

// Order matters — first match wins (most specific / highest value first).
const RULES: Rule[] = [
  { keys: ['exposici', 'mostra'], category: 'exhibition', quality: 0.85, label: 'Exhibition', shortLabel: 'ART' },
  { keys: ['concert', 'recital', 'gira'], category: 'music', quality: 0.88, label: 'Concert', shortLabel: 'MUSIC' },
  { keys: ['dj', 'discoteca', 'sessio golfa', 'nit '], category: 'nightlife', quality: 0.8, label: 'DJ set', shortLabel: 'DJ' },
  { keys: ['teatre'], category: 'culture', quality: 0.78, label: 'Theatre', shortLabel: 'THEATRE' },
  { keys: ['espectacle'], category: 'culture', quality: 0.74, label: 'Show', shortLabel: 'SHOW' },
  { keys: ['fira', 'mercat', 'firart'], category: 'market', quality: 0.72, label: 'Market', shortLabel: 'MARKET' },
  { keys: ['tast', 'degustaci', 'vermut', 'gastr', 'cuina'], category: 'food', quality: 0.7, label: 'Food', shortLabel: 'FOOD' },
  { keys: ['projecci', 'cinema', 'cineforum', 'film', "pel"], category: 'culture', quality: 0.66, label: 'Film', shortLabel: 'FILM' },
  { keys: ['dansa', 'sardanes', 'sevillanes', 'ball '], category: 'culture', quality: 0.62, label: 'Dance', shortLabel: 'DANCE' },
  { keys: ['esport', 'futbol', 'basquet', 'cursa', 'marato', 'running', 'ioga'], category: 'sports', quality: 0.62, label: 'Sport', shortLabel: 'SPORT' },
  { keys: ['festival'], category: 'culture', quality: 0.72, label: 'Festival', shortLabel: 'FEST' },
  { keys: ['festa major', 'festes de', 'festa de', 'revetlla'], category: 'culture', quality: 0.58, label: 'Festa', shortLabel: 'FESTA' },
  { keys: ['visita guiada', 'itinerari', 'ruta ', 'passejada'], category: 'culture', quality: 0.56, label: 'Guided tour', shortLabel: 'TOUR' },
  { keys: ['xerrada', 'conferencia', 'debat', 'taula rodona', 'colloqui'], category: 'culture', quality: 0.52, label: 'Talk', shortLabel: 'TALK' },
  { keys: ['assemblea', 'manifest', 'protesta', 'reivindicaci'], category: 'civic', quality: 0.55, label: 'Civic', shortLabel: 'CIVIC' },
  { keys: ['narracio', 'contes', 'conte ', 'titelles'], category: 'culture', quality: 0.46, label: 'Storytelling', shortLabel: 'TALES' },
  { keys: ['taller'], category: 'culture', quality: 0.34, label: 'Workshop', shortLabel: 'WORK' },
  { keys: ['curs ', 'formacio', 'setmana de curs', 'casal'], category: 'culture', quality: 0.3, label: 'Course', shortLabel: 'COURSE' },
  { keys: ['jornada'], category: 'civic', quality: 0.4, label: 'Open day', shortLabel: 'DAY' },
];

export function classify(name: string): Classification {
  const s = asciiLower(name);

  if (DROP_PATTERNS.some((p) => s.includes(p))) {
    return { category: 'other', quality: 0, label: 'Activity', shortLabel: 'NOW', drop: true };
  }

  for (const rule of RULES) {
    if (rule.keys.some((k) => s.includes(k))) {
      return {
        category: rule.category,
        quality: rule.quality,
        label: rule.label,
        shortLabel: rule.shortLabel,
        drop: false,
      };
    }
  }
  return { category: 'other', quality: 0.32, label: 'Activity', shortLabel: 'NOW', drop: false };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Time relevance 0..1 — prioritise today / next 48h; keep but deprioritise
 * long-running permanent activities (e.g. months-long exhibitions).
 */
export function timeRelevance(
  startMs: number,
  endMs: number | null,
  now: number,
): number {
  if (startMs <= now) {
    // Ongoing (already filtered to end >= now).
    const duration = endMs && endMs > startMs ? endMs - startMs : 0;
    if (duration > 30 * DAY) return 0.3; // long-running / permanent
    if (duration > 7 * DAY) return 0.5; // multi-week
    return 0.8; // ongoing now, short
  }
  const hours = (startMs - now) / HOUR;
  if (hours <= 48) return 1; // today / next 48h
  if (hours <= 24 * 7) return 0.6; // this week
  return 0.4; // later in window
}

/** Whether an activity runs longer than ~30 days. */
export function isLongRunning(startMs: number, endMs: number | null): boolean {
  return !!endMs && endMs - startMs > 30 * DAY;
}

/** Combined rank used to order + cap the feed. */
export function rankScore(quality: number, timeRel: number): number {
  return 0.55 * timeRel + 0.45 * quality;
}
