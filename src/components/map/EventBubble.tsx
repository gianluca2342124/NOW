import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { EventStatus, NowEvent } from '@/types/event';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { BUBBLE, getBubbleMotion } from '@/lib/bubble';

interface EventBubbleProps {
  event: NowEvent;
  status: EventStatus;
  /** Blended relevance 0..1 → drives size/hierarchy. */
  relevance: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * The animated event bubble — the soul of NOW.
 *
 * SIZE is driven by `relevance` (live + near + important + starting-soon) so
 * the map reads as an intentional hierarchy. MOTION is driven by live `status`
 * intensity so a "live" event always feels alive, even far away. A premium
 * Lucide icon (never emoji) sits in the core.
 *
 * Respects prefers-reduced-motion (pulses → static glow) and always exposes a
 * >= 44px tap target. Mounting/unmounting (filter changes) is animated by an
 * <AnimatePresence> in the parent portal.
 */
function EventBubbleBase({
  event,
  status,
  relevance,
  selected,
  onSelect,
}: EventBubbleProps) {
  const category = CATEGORY_CONFIG[event.category];
  const Icon = category.icon;
  const m = getBubbleMotion(status, relevance);
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={`${event.title} — ${status}`}
      onClick={() => onSelect(event.id)}
      className="now-marker relative grid place-items-center bg-transparent p-0"
      style={{ minWidth: BUBBLE.hitArea, minHeight: BUBBLE.hitArea }}
      initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      whileTap={{ scale: 0.92 }}
    >
      {/* Expanding halo — the "pulse" of an active event. Motion only. */}
      {m.showHalo && !reduceMotion && (
        <motion.span
          className="pointer-events-none absolute rounded-full"
          style={{
            width: m.coreSize,
            height: m.coreSize,
            backgroundColor: category.color,
          }}
          animate={{ scale: [1, BUBBLE.haloMaxScale], opacity: [0.5 * m.intensity, 0] }}
          transition={{
            duration: m.haloDuration,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Ambient glow — present in both motion and reduced-motion modes. */}
      <span
        className="pointer-events-none absolute rounded-full blur-md"
        style={{
          width: m.glowSize,
          height: m.glowSize,
          backgroundColor: category.color,
          opacity: m.glowOpacity,
        }}
      />

      {/* Core — breathes when motion is allowed, static otherwise. */}
      <motion.span
        className="relative grid place-items-center rounded-full shadow-bubble"
        style={{
          width: m.coreSize,
          height: m.coreSize,
          background: `radial-gradient(circle at 35% 30%, ${category.color}, ${category.color}cc)`,
          border: selected
            ? '2px solid #fbbf24'
            : '2px solid rgba(255,255,255,0.55)',
          boxShadow: selected
            ? '0 0 0 4px rgba(245,158,11,0.35), 0 6px 24px rgba(0,0,0,0.5)'
            : undefined,
        }}
        animate={reduceMotion ? undefined : { scale: [1, m.breatheScale, 1] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: m.breatheDuration, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <Icon
          size={m.iconSize}
          strokeWidth={2.25}
          className="text-white drop-shadow"
        />
      </motion.span>
    </motion.button>
  );
}

export const EventBubble = memo(EventBubbleBase);
