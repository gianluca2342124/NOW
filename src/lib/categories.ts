import type { LucideIcon } from 'lucide-react';
import {
  Drama,
  Martini,
  Megaphone,
  Music,
  Sparkles,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react';
import type { EventCategory, EventStatus } from '@/types/event';

export interface CategoryConfig {
  label: string;
  /** Hex color used for the bubble core + glow. Mirrors tailwind.config. */
  color: string;
  /** Premium Lucide icon — no emoji anywhere in NOW. */
  icon: LucideIcon;
}

export const CATEGORY_CONFIG: Record<EventCategory, CategoryConfig> = {
  nightlife: { label: 'Nightlife', color: '#a855f7', icon: Martini },
  music: { label: 'Music', color: '#ec4899', icon: Music },
  sports: { label: 'Sports', color: '#22c55e', icon: Trophy },
  culture: { label: 'Culture', color: '#38bdf8', icon: Drama },
  food: { label: 'Food', color: '#fb923c', icon: UtensilsCrossed },
  civic: { label: 'Civic', color: '#f43f5e', icon: Megaphone },
  other: { label: 'Other', color: '#fbbf24', icon: Sparkles },
};

/** Stable ordering for the filter chip row. */
export const CATEGORY_ORDER: EventCategory[] = [
  'music',
  'nightlife',
  'sports',
  'culture',
  'food',
  'civic',
];

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
