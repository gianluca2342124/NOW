import type { EventStatus } from '@/types/event';
import { STATUS_CONFIG } from '@/lib/categories';

/**
 * Bubble geometry + motion constants.
 *
 * These used to live as magic numbers inside <EventBubble>. Centralising them
 * keeps the visual language tunable in one place and the component declarative.
 * Everything scales off a status's `intensity` (0..1) so a "live" event reads
 * as more alive than an "upcoming" one.
 */
export const BUBBLE = {
  /** Minimum clickable hit area (px). HIG-compliant tap target. */
  hitArea: 44,

  /** Visible core diameter (px) = base + range * intensity. */
  coreSizeBase: 30,
  coreSizeRange: 14,

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

  /** Glyph font-size as a fraction of the core diameter. */
  glyphFactor: 0.46,
} as const;

export interface BubbleMotion {
  coreSize: number;
  glowSize: number;
  glowOpacity: number;
  breatheScale: number;
  breatheDuration: number;
  haloDuration: number;
  showHalo: boolean;
  glyphSize: number;
  intensity: number;
}

/** Resolve all derived bubble dimensions/timings for a given status. */
export function getBubbleMotion(status: EventStatus): BubbleMotion {
  const { intensity } = STATUS_CONFIG[status];
  const coreSize = BUBBLE.coreSizeBase + BUBBLE.coreSizeRange * intensity;
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
    glyphSize: coreSize * BUBBLE.glyphFactor,
  };
}
