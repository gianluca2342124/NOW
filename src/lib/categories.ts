import type { LucideIcon } from 'lucide-react';
import {
  Drama,
  Image,
  Martini,
  Megaphone,
  Music,
  ShoppingBag,
  Sparkles,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react';
import type {
  DisplayStatus,
  EventCategory,
  TimeState,
} from '@/types/activity';

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
  market: { label: 'Markets', color: '#34d399', icon: ShoppingBag },
  exhibition: { label: 'Exhibitions', color: '#818cf8', icon: Image },
  other: { label: 'Other', color: '#fbbf24', icon: Sparkles },
};

/** Categories offered as filter chips (everything except the catch-all). */
export const CATEGORY_ORDER: EventCategory[] = [
  'music',
  'nightlife',
  'sports',
  'culture',
  'food',
  'civic',
  'market',
  'exhibition',
];

export interface DisplayStatusConfig {
  label: string;
  color: string;
  /** Only `live_now` gets the "hot" live treatment. */
  hot: boolean;
}

export const DISPLAY_STATUS_CONFIG: Record<DisplayStatus, DisplayStatusConfig> = {
  verified_live: { label: 'Live now', color: '#f59e0b', hot: true },
  happening_now: { label: 'Happening now', color: '#38bdf8', hot: true },
  open_today: { label: 'Open today', color: '#7dd3fc', hot: false },
  ongoing: { label: 'Ongoing', color: '#94a3b8', hot: false },
  starting_soon: { label: 'Starting soon', color: '#fbbf24', hot: false },
  tonight: { label: 'Tonight', color: '#7dd3fc', hot: false },
  today: { label: 'Today', color: '#a5b4fc', hot: false },
  tomorrow: { label: 'Tomorrow', color: '#94a3b8', hot: false },
  upcoming: { label: 'Upcoming', color: '#94a3b8', hot: false },
  ended: { label: 'Ended', color: '#78716c', hot: false },
};

/**
 * Ambient motion intensity by factual time-state (0..1). This is *aliveness*,
 * not a truth claim — a curated activity can breathe softly without asserting
 * it is verified-live. The bright "live ring" is reserved for `live_now` only.
 */
export const INTENSITY_BY_TIME_STATE: Record<TimeState, number> = {
  ongoing: 0.7,
  soon: 0.55,
  today: 0.4,
  tomorrow: 0.28,
  later: 0.22,
  ended: 0,
};
