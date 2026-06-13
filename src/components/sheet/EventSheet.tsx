import { AnimatePresence, motion } from 'framer-motion';
import type { NowEvent } from '@/types/event';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { deriveStatus, formatTimeLabel } from '@/lib/time';
import {
  BARCELONA_CENTER,
  distanceKm,
  formatDistance,
  googleMapsDirectionsUrl,
} from '@/lib/geo';
import { StatusPill } from '@/components/ui/StatusPill';

interface EventSheetProps {
  event: NowEvent | null;
  now: number;
  onClose: () => void;
}

/**
 * Glassmorphism bottom sheet. Slides up on select, drag-down or backdrop-tap
 * to dismiss. Shows the full event card + a Go button to Google Maps.
 *
 * Distance is a placeholder: measured from Barcelona centre, since we have no
 * user-location permission flow yet (out of scope for the prototype).
 */
export function EventSheet({ event, now, onClose }: EventSheetProps) {
  return (
    <AnimatePresence>
      {event && (
        <Sheet key={event.id} event={event} now={now} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function Sheet({ event, now, onClose }: { event: NowEvent; now: number; onClose: () => void }) {
  const category = CATEGORY_CONFIG[event.category];
  const status = deriveStatus(event, now) ?? 'upcoming';
  const km = distanceKm(BARCELONA_CENTER, event.coordinates);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-3 shadow-glass"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        {/* Grab handle */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />

        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              color: category.color,
              backgroundColor: `${category.color}1f`,
              border: `1px solid ${category.color}40`,
            }}
          >
            <span>{category.glyph}</span>
            {category.label}
          </span>
          <StatusPill status={status} />
        </div>

        <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
          {event.title}
        </h2>
        <p className="mt-0.5 text-sm font-medium text-stone-400">
          {event.venue}
        </p>

        <div className="mt-4 flex items-center gap-4 text-sm text-stone-300">
          <span className="font-semibold text-now-soft">
            {formatTimeLabel(event, now)}
          </span>
          <span className="text-stone-500">·</span>
          <span>{formatDistance(km)}</span>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-stone-300">
          {event.description}
        </p>

        <a
          href={googleMapsDirectionsUrl(event.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-now-soft to-now py-4 text-base font-extrabold text-ink-900 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.98]"
        >
          <span className="text-lg">↗</span> Go
        </a>
      </motion.div>
    </>
  );
}
