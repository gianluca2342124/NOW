import type { EventStatus } from '@/types/event';
import { STATUS_CONFIG } from '@/lib/categories';

/**
 * Bubble geometry + motion constants.
 *
 * Two independent signals shape a bubble:
 *   - `relevance` (0..1) drives SIZE — the visual hierarchy (see lib/relevance).
 *   - status `intensity` (0..1) drives MOTION — how alive it feels.
 *
 * Keeping these separate is deliberate: a far-away live event still *pulses*
 * like it's live, but a near, important, live event reads *bigger*. This is
 * what makes the map feel intentional instead of chaotic.
 */
export const BUBBLE = {
  /** Minimum clickable hit area (px). HIG-compliant tap target. */
  hitArea: 44,

  /** Visible core diameter (px) = base + range * relevance. */
  coreSizeBase: 26,
  coreSizeRange: 22,

  /** Ambient glow diameter as a multiple of the core. */
  glowSizeFactor: 1.5,
  glowOpacityBase: 0.1,
  glowOpacityRange: 0.35,

  /** Breathing scale = 1 + range * intensity. */
  breatheScaleRange: 0.12,
  /** Breathing duration (s) = max - range * intensity (hotter = faster). */
  breatheDurationMax: 3.4,
  breatheDurationRange: 1.4,

  /** Expanding pulse halo only renders at/above this intensity. */
  haloThreshold: 0.55,
  haloDurationExtra: 0.6,
  haloMaxScale: 2.4,

  /** Icon size as a fraction of the core diameter. */
  iconFactor: 0.5,

  /** Higher-relevance bubbles stack above calmer ones. */
  zIndexBase: 1,
  zIndexRange: 1000,
} as const;

export interface BubbleMotion {
  coreSize: number;
  glowSize: number;
  glowOpacity: number;
  breatheScale: number;
  breatheDuration: number;
  haloDuration: number;
  showHalo: boolean;
  iconSize: number;
  /** Motion intensity (status-led). */
  intensity: number;
  /** Stacking order so the most relevant bubbles sit on top. */
  zIndex: number;
}

/**
 * Resolve all derived bubble dimensions/timings.
 * @param status   live status → motion intensity
 * @param relevance 0..1 blended score → size + stacking (defaults to 0.5)
 */
export function getBubbleMotion(
  status: EventStatus,
  relevance = 0.5,
): BubbleMotion {
  const { intensity } = STATUS_CONFIG[status];
  const coreSize = BUBBLE.coreSizeBase + BUBBLE.coreSizeRange * relevance;
  const breatheDuration =
    BUBBLE.breatheDurationMax - BUBBLE.breatheDurationRange * intensity;

  return {
    intensity,
    coreSize,
    glowSize: coreSize * BUBBLE.glowSizeFactor,
    glowOpacity: BUBBLE.glowOpacityBase + BUBBLE.glowOpacityRange * intensity,
    breatheScale: 1 + BUBBLE.breatheScaleRange * intensity,
    breatheDuration,
    haloDuration: breatheDuration + BUBBLE.haloDurationExtra,
    showHalo: intensity >= BUBBLE.haloThreshold,
    iconSize: coreSize * BUBBLE.iconFactor,
    zIndex: Math.round(BUBBLE.zIndexBase + BUBBLE.zIndexRange * relevance),
  };
}
