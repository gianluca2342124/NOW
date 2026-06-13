import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';
import type { Activity, DisplayStatus } from '@/types/activity';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { effectiveVerification } from '@/lib/verification';
import { BUBBLE, getBubbleMotion } from '@/lib/bubble';

interface ActivityBubbleProps {
  activity: Activity;
  displayStatus: DisplayStatus;
  /** Ambient motion 0..1 (time-state). */
  intensity: number;
  /** Visual emphasis 0..1 (size/stacking). */
  emphasis: number;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * The activity bubble.
 *
 * SIZE encodes emphasis (timeliness + proximity + importance + confidence).
 * MOTION encodes ambient timeliness — a soft breath, NOT a truth claim. The
 * bright expanding "live ring" is reserved for `live_now` only, so the map can
 * feel alive without ever faking liveness (see TRUST_MODEL.md).
 *
 * A subtle check micro-badge marks official/verified sources. The short map
 * label appears only for the selected bubble to keep the map scannable.
 */
function ActivityBubbleBase({
  activity,
  displayStatus,
  intensity,
  emphasis,
  selected,
  onSelect,
}: ActivityBubbleProps) {
  const category = CATEGORY_CONFIG[activity.category];
  const Icon = category.icon;
  const m = getBubbleMotion(intensity, emphasis);
  const reduceMotion = useReducedMotion();

  const isLive = displayStatus === 'live_now';
  const verification = effectiveVerification(activity);
  const trusted =
    verification === 'official_source' || verification === 'verified';

  return (
    <motion.button
      type="button"
      aria-label={`${activity.activityLabel} at ${activity.venueName}`}
      onClick={() => onSelect(activity.id)}
      className="now-marker relative grid place-items-center bg-transparent p-0"
      style={{ minWidth: BUBBLE.hitArea, minHeight: BUBBLE.hitArea }}
      initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      whileTap={{ scale: 0.92 }}
    >
      {/* LIVE RING — a real truth claim, only for verified-live activities. */}
      {isLive && !reduceMotion && (
        <motion.span
          className="pointer-events-none absolute rounded-full"
          style={{
            width: m.coreSize,
            height: m.coreSize,
            backgroundColor: '#f59e0b',
          }}
          animate={{ scale: [1, BUBBLE.haloMaxScale], opacity: [0.55, 0] }}
          transition={{ duration: m.haloDuration, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Soft ambient glow — calm aliveness, present for everything. */}
      <span
        className="pointer-events-none absolute rounded-full blur-md"
        style={{
          width: m.glowSize,
          height: m.glowSize,
          backgroundColor: category.color,
          opacity: m.glowOpacity,
        }}
      />

      {/* Breathing core. */}
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
        <Icon size={m.iconSize} strokeWidth={2.25} className="text-white drop-shadow" />

        {/* Verified micro-badge. */}
        {trusted && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-ink-900">
            <BadgeCheck className="h-3 w-3" strokeWidth={2.5} color="#22c55e" />
          </span>
        )}
      </motion.span>

      {/* Short activity label — only for the selected bubble (no clutter). */}
      {selected && (
        <span className="absolute top-full mt-1 whitespace-nowrap rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-now-soft backdrop-blur">
          {activity.shortMapLabel}
        </span>
      )}
    </motion.button>
  );
}

export const ActivityBubble = memo(ActivityBubbleBase);
