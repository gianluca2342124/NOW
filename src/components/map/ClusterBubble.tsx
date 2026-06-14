import { motion, useReducedMotion } from 'framer-motion';

interface ClusterBubbleProps {
  count: number;
  /** 0..1 — highest pulse among the cluster's members, tints prominence. */
  intensity: number;
  onClick: () => void;
}

/**
 * A cluster marker showing how many activities are grouped at this zoom. Tap to
 * zoom in. Sized by member count; tinted by the cluster's strongest pulse.
 */
export function ClusterBubble({ count, intensity, onClick }: ClusterBubbleProps) {
  const reduceMotion = useReducedMotion();
  const size = 34 + Math.min(26, Math.log2(count + 1) * 9);

  return (
    <motion.button
      type="button"
      aria-label={`${count} activities — zoom in`}
      onClick={onClick}
      className="relative grid place-items-center rounded-full"
      style={{ width: size, height: size }}
      initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={{ scale: 0.92 }}
    >
      <span
        className="absolute inset-0 rounded-full blur-md"
        style={{ backgroundColor: '#f59e0b', opacity: 0.18 + 0.25 * intensity }}
      />
      <span
        className="relative grid h-full w-full place-items-center rounded-full font-extrabold text-ink-900"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #fbbf24, #f59e0b)',
          border: '2px solid rgba(255,255,255,0.7)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          fontSize: size * 0.38,
        }}
      >
        {count}
      </span>
    </motion.button>
  );
}
