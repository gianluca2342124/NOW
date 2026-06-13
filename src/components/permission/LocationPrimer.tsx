import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';

interface LocationPrimerProps {
  onEnable: () => void;
  onSkip: () => void;
}

/**
 * Premium pre-permission screen. It sits over the already-live map (so the
 * first frame is still the hero) and explains *why* NOW wants location before
 * the native prompt appears. "Enable" provides the user gesture the browser
 * requires to show its permission dialog.
 */
export function LocationPrimer({ onEnable, onSkip }: LocationPrimerProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Dim + focus the map behind. */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      <motion.div
        className="glass safe-bottom relative z-10 m-3 rounded-3xl px-6 pt-7 shadow-glass"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      >
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-now-soft to-now-deep shadow-[0_8px_30px_rgba(245,158,11,0.4)]">
          <Navigation className="h-6 w-6 text-ink-900" strokeWidth={2.5} />
        </div>

        <h2 className="text-center text-2xl font-extrabold leading-tight tracking-tight">
          See what&apos;s alive around you
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-center text-[15px] leading-relaxed text-stone-300">
          NOW uses your location to surface what&apos;s happening{' '}
          <span className="text-now-soft">right now</span> nearby — and to show
          how far each moment is from you.
        </p>

        <button
          type="button"
          onClick={onEnable}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-now-soft to-now py-4 text-base font-extrabold text-ink-900 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.98]"
        >
          <Navigation className="h-5 w-5" strokeWidth={2.5} />
          Enable location
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-1 w-full py-3 text-sm font-semibold text-stone-400 transition-colors active:text-stone-200"
        >
          Not now
        </button>
      </motion.div>
    </div>
  );
}
