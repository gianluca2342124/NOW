import type { EventCategory } from './types';

/**
 * Classification + quality + ranking + diversity balancing for Barcelona Open
 * Data (agenda-diaria). The dataset has no usable category fields, so type is
 * inferred from the (Catalan) event name.
 */
export interface Classification {
  category: EventCategory;
  quality: number;
  label: string;
  shortLabel: string;
  drop: boolean;
}

function asciiLower(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/·/g, '')
    .toLowerCase();
}

/** Low-value / repetitive / administrative records to remove entirely. */
const DROP_PATTERNS = [
  'patis escolar',
  'pati escolar',
  'pati obert',
  'espai de trobada',
  'punt de trobada',
  "punt d'informaci",
  "punt d'atenci",
  'banc del temps',
  'assessorament',
  'consultori',
  "oficina d'atencio",
  'tramit',
  'servei municipal',
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
  { keys: ['concert', 'recital', 'gira', 'jam session'], category: 'music', quality: 0.92, label: 'Concert', shortLabel: 'MUSIC' },
  { keys: ['dj', 'discoteca', 'sessio golfa', 'nit '], category: 'nightlife', quality: 0.86, label: 'DJ set', shortLabel: 'DJ' },
  { keys: ['teatre'], category: 'culture', quality: 0.84, label: 'Theatre', shortLabel: 'THEATRE' },
  { keys: ['festival'], category: 'culture', quality: 0.82, label: 'Festival', shortLabel: 'FEST' },
  { keys: ['espectacle'], category: 'culture', quality: 0.78, label: 'Show', shortLabel: 'SHOW' },
  { keys: ['projecci', 'cinema', 'cineforum', 'film', 'pel'], category: 'culture', quality: 0.76, label: 'Film', shortLabel: 'FILM' },
  { keys: ['fira', 'mercat', 'firart'], category: 'market', quality: 0.76, label: 'Market', shortLabel: 'MARKET' },
  { keys: ['tast', 'degustaci', 'vermut', 'gastr', 'cuina'], category: 'food', quality: 0.74, label: 'Food', shortLabel: 'FOOD' },
  { keys: ['festa major', 'festes de', 'festa de', 'revetlla'], category: 'culture', quality: 0.7, label: 'Festa', shortLabel: 'FESTA' },
  { keys: ['dansa', 'sardanes', 'sevillanes', 'ball '], category: 'culture', quality: 0.62, label: 'Dance', shortLabel: 'DANCE' },
  { keys: ['esport', 'futbol', 'basquet', 'cursa', 'marato', 'running', 'ioga'], category: 'sports', quality: 0.64, label: 'Sport', shortLabel: 'SPORT' },
  { keys: ['exposici', 'mostra'], category: 'exhibition', quality: 0.6, label: 'Exhibition', shortLabel: 'ART' },
  { keys: ['visita guiada', 'itinerari', 'ruta ', 'passejada'], category: 'culture', quality: 0.54, label: 'Guided tour', shortLabel: 'TOUR' },
  { keys: ['xerrada', 'conferencia', 'debat', 'taula rodona', 'colloqui'], category: 'culture', quality: 0.5, label: 'Talk', shortLabel: 'TALK' },
  { keys: ['assemblea', 'manifest', 'protesta', 'reivindicaci'], category: 'civic', quality: 0.52, label: 'Civic', shortLabel: 'CIVIC' },
  { keys: ['narracio', 'contes', 'conte ', 'titelles'], category: 'culture', quality: 0.44, label: 'Storytelling', shortLabel: 'TALES' },
  { keys: ['taller'], category: 'culture', quality: 0.32, label: 'Workshop', shortLabel: 'WORK' },
  { keys: ['curs ', 'formacio', 'setmana de curs', 'casal'], category: 'culture', quality: 0.28, label: 'Course', shortLabel: 'COURSE' },
  { keys: ['jornada'], category: 'civic', quality: 0.38, label: 'Open day', shortLabel: 'DAY' },
];

export function classify(name: string): Classification {
  const s = asciiLower(name);

  if (DROP_PATTERNS.some((p) => s.includes(p))) {
    return { category: 'other', quality: 0, label: 'Activity', shortLabel: 'NOW', drop: true };
  }
  for (const rule of RULES) {
    if (rule.keys.some((k) => s.includes(k))) {
      return { category: rule.category, quality: rule.quality, label: rule.label, shortLabel: rule.shortLabel, drop: false };
    }
  }
  return { category: 'other', quality: 0.3, label: 'Activity', shortLabel: 'NOW', drop: false };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Time relevance 0..1 — strongly favour today / next 48h / next 7 days; heavily
 * penalise long-running (months) activities that started long ago.
 */
export function timeRelevance(startMs: number, endMs: number | null, now: number): number {
  const duration = endMs && endMs > startMs ? endMs - startMs : 0;

  if (startMs <= now) {
    // Ongoing.
    if (duration > 90 * DAY) return 0.1; // very long-running / quasi-permanent
    if (duration > 30 * DAY) return 0.22; // long-running
    if (duration > 7 * DAY) return 0.45; // multi-week
    return 0.72; // genuinely on now, short
  }

  const hours = (startMs - now) / HOUR;
  if (hours <= 24) return 1; // today
  if (hours <= 48) return 0.92; // tomorrow
  if (hours <= 24 * 7) return 0.78; // next 7 days
  if (hours <= 24 * 14) return 0.5;
  return 0.32;
}

/** A one-off / single-day event (boosts concerts, film, theatre over long shows). */
export function isOneOff(startMs: number, endMs: number | null): boolean {
  if (!endMs) return false;
  const d = endMs - startMs;
  return d > 0 && d <= 28 * HOUR;
}

/**
 * Whether the start carries a precise time of day rather than the all-day
 * placeholder (the dataset uses 03:00 for all-day records).
 */
export function isPrecise(startMs: number): boolean {
  const d = new Date(startMs);
  const hm = d.getUTCHours() * 60 + d.getUTCMinutes();
  return hm !== 3 * 60 && hm !== 0; // not 03:00 / 00:00 placeholders
}

/** Combined rank: time-relevance led, with quality + one-off + precision boosts. */
export function rankScore(
  quality: number,
  timeRel: number,
  oneOff: boolean,
  precise: boolean,
): number {
  let r = 0.5 * timeRel + 0.38 * quality;
  if (oneOff) r += 0.09;
  if (precise) r += 0.05;
  return Math.min(1, r);
}

// --- Diversity balancing ---

export interface Balanceable {
  category: EventCategory;
  rank: number;
}

/** Per-category soft caps as a fraction of the pool ceiling. */
const CAP_FRACTION: Partial<Record<EventCategory, number>> = {
  exhibition: 0.3,
  culture: 0.28,
  music: 0.24,
  market: 0.18,
  food: 0.16,
  nightlife: 0.14,
  sports: 0.16,
  civic: 0.12,
  other: 0.12,
};
const DEFAULT_CAP_FRACTION = 0.15;
/** No single category may exceed this share of the final feed. */
const MAX_SHARE = 0.33;

function distribution(items: { category: EventCategory }[]): Record<string, number> {
  const d: Record<string, number> = {};
  for (const it of items) d[it.category] = (d[it.category] ?? 0) + 1;
  return d;
}

export interface BalanceResult<T> {
  selected: T[];
  preBalance: Record<string, number>;
  postBalance: Record<string, number>;
  caps: Record<string, number>;
  maxShare: number;
}

/**
 * Select a diverse, rank-ordered feed: apply per-category caps, then trim the
 * lowest-ranked items of any category exceeding MAX_SHARE so no category
 * dominates (e.g. exhibitions can't be an exhibition directory).
 */
export function balanceFeed<T extends Balanceable>(items: T[], maxOutput: number): BalanceResult<T> {
  const sorted = [...items].sort((a, b) => b.rank - a.rank);
  const preBalance = distribution(sorted.slice(0, maxOutput));

  const caps: Record<string, number> = {};
  const capFor = (c: EventCategory) =>
    Math.max(1, Math.round((CAP_FRACTION[c] ?? DEFAULT_CAP_FRACTION) * maxOutput));

  // Pass 1: per-category caps.
  const counts: Record<string, number> = {};
  let selected: T[] = [];
  for (const it of sorted) {
    if (selected.length >= maxOutput) break;
    const cap = capFor(it.category);
    caps[it.category] = cap;
    if ((counts[it.category] ?? 0) < cap) {
      selected.push(it);
      counts[it.category] = (counts[it.category] ?? 0) + 1;
    }
  }

  // Pass 2: enforce max share — trim lowest-ranked of any dominant category.
  for (let guard = 0; guard < 200; guard += 1) {
    const total = selected.length;
    const dist = distribution(selected);
    const offender = Object.entries(dist).find(([, n]) => n > MAX_SHARE * total);
    if (!offender) break;
    const [cat] = offender;
    let idx = -1;
    for (let i = selected.length - 1; i >= 0; i -= 1) {
      if (selected[i].category === cat) {
        idx = i;
        break;
      }
    }
    if (idx < 0) break;
    selected = selected.slice(0, idx).concat(selected.slice(idx + 1));
  }

  return { selected, preBalance, postBalance: distribution(selected), caps, maxShare: MAX_SHARE };
}
