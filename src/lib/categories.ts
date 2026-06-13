import type { EventCategory, EventStatus } from '@/types/event';

export interface CategoryConfig {
  label: string;
  /** Hex color used for the bubble core + glow. Mirrors tailwind.config. */
  color: string;
  /** Single emoji glyph shown inside the bubble. */
  glyph: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, CategoryConfig> = {
  nightlife: { label: 'Nightlife', color: '#a855f7', glyph: '🌙' },
  music: { label: 'Music', color: '#ec4899', glyph: '🎵' },
  sports: { label: 'Sports', color: '#22c55e', glyph: '⚽' },
  culture: { label: 'Culture', color: '#38bdf8', glyph: '🎭' },
  food: { label: 'Food', color: '#fb923c', glyph: '🍷' },
  civic: { label: 'Civic', color: '#f43f5e', glyph: '📣' },
};

export interface StatusConfig {
  label: string;
  /** Accent color for the status pill. */
  color: string;
  /** Relative animation intensity 0..1 — drives bubble "aliveness". */
  intensity: number;
}

export const STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  upcoming: { label: 'Upcoming', color: '#94a3b8', intensity: 0.25 },
  imminent: { label: 'Starting soon', color: '#fbbf24', intensity: 0.6 },
  live: { label: 'Live now', color: '#f59e0b', intensity: 1 },
  ending: { label: 'Ending soon', color: '#fb7185', intensity: 0.8 },
};
