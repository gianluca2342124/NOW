import { memo } from 'react';
import { motion } from 'framer-motion';
import type { EventStatus, NowEvent } from '@/types/event';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '@/lib/categories';

interface EventBubbleProps {
  event: NowEvent;
  status: EventStatus;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * The animated event bubble. This is the soul of NOW — its motion is keyed to
 * the live status `intensity` so a "live" event visibly breathes harder than
 * an "upcoming" one. Category color tints the core + glow.
 */
function EventBubbleBase({ event, status, selected, onSelect }: EventBubbleProps) {
  const category = CATEGORY_CONFIG[event.category];
  const { intensity } = STATUS_CONFIG[status];

  // Hotter events breathe faster and wider.
  const breatheScale = 1 + 0.12 * intensity;
  const breatheDuration = 3.4 - 1.4 * intensity;
  const size = 30 + 14 * intensity; // px diameter of the core

  return (
    <motion.button
      type="button"
      aria-label={`${event.title} — ${STATUS_CONFIG[status].label}`}
      onClick={() => onSelect(event.id)}
      className="now-marker relative grid place-items-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      whileTap={{ scale: 0.92 }}
    >
      {/* Expanding halo — the "pulse" of an active event. */}
      {intensity >= 0.55 && (
        <motion.span
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: category.color,
          }}
          animate={{ scale: [1, 2.4], opacity: [0.5 * intensity, 0] }}
          transition={{
            duration: breatheDuration + 0.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Soft ambient glow. */}
      <span
        className="absolute rounded-full blur-md"
        style={{
          width: size * 1.5,
          height: size * 1.5,
          backgroundColor: category.color,
          opacity: 0.35 * intensity + 0.1,
        }}
      />

      {/* Breathing core. */}
      <motion.span
        className="relative grid place-items-center rounded-full text-base shadow-bubble"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 30%, ${category.color}, ${category.color}cc)`,
          border: selected
            ? '2px solid #fbbf24'
            : '2px solid rgba(255,255,255,0.65)',
          boxShadow: selected
            ? '0 0 0 4px rgba(245,158,11,0.35), 0 6px 24px rgba(0,0,0,0.5)'
            : undefined,
        }}
        animate={{ scale: [1, breatheScale, 1] }}
        transition={{
          duration: breatheDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span style={{ fontSize: size * 0.46, lineHeight: 1 }}>
          {category.glyph}
        </span>
      </motion.span>
    </motion.button>
  );
}

export const EventBubble = memo(EventBubbleBase);
