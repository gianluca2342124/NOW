import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { NowEvent } from '@/types/event';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { deriveStatus, formatTimeLabel } from '@/lib/time';
import {
  BARCELONA_CENTER,
  distanceKm,
  formatDistance,
  googleMapsDirectionsUrl,
} from '@/lib/geo';
import { useNowStore } from '@/store/useNowStore';
import { StatusPill } from '@/components/ui/StatusPill';

interface EventSheetProps {
  event: NowEvent | null;
  now: number;
  onClose: () => void;
}

/**
 * Glassmorphism bottom sheet with an iOS / Apple Maps / VisionOS feel. Slides
 * up on select; drag-down or backdrop-tap to dismiss. Distance is measured from
 * the live user location when available, otherwise from Barcelona centre.
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

function Sheet({
  event,
  now,
  onClose,
}: {
  event: NowEvent;
  now: number;
  onClose: () => void;
}) {
  const userLocation = useNowStore((s) => s.userLocation);
  const category = CATEGORY_CONFIG[event.category];
  const Icon = category.icon;
  const status = deriveStatus(event, now) ?? 'upcoming';

  const origin = userLocation ?? BARCELONA_CENTER;
  const km = distanceKm(origin, event.coordinates);
  const distanceLabel = userLocation
    ? formatDistance(km)
    : `${formatDistance(km).replace(' away', '')} from centre`;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] px-5 pt-3 shadow-glass"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-white/20" />

        {/* Header row: category icon + status */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{
                backgroundColor: `${category.color}1f`,
                boxShadow: `inset 0 0 0 1px ${category.color}40`,
              }}
            >
              <Icon
                className="h-[18px] w-[18px]"
                strokeWidth={2.25}
                color={category.color}
              />
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: category.color }}
            >
              {category.label}
            </span>
          </div>
          <StatusPill status={status} />
        </div>

        {/* Title + venue */}
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight">
          {event.title}
        </h2>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-400">
          <MapPin className="h-4 w-4" strokeWidth={2} />
          {event.venue}
        </div>

        {/* Meta row: time · distance */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="font-semibold text-now-soft">
            {formatTimeLabel(event, now)}
          </span>
          <span className="h-1 w-1 rounded-full bg-stone-600" />
          <span className="text-stone-300">{distanceLabel}</span>
        </div>

        {/* Description */}
        <p className="mt-4 text-[15px] leading-relaxed text-stone-300">
          {event.description}
        </p>

        {/* Primary CTA */}
        <a
          href={googleMapsDirectionsUrl(event.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-now-soft to-now py-4 text-base font-extrabold text-ink-900 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.98]"
        >
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
          Go
        </a>

        {/* Secondary link — only when the event carries a source. */}
        {event.sourceUrl && (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 mb-1 block w-full py-3 text-center text-sm font-semibold text-stone-400 transition-colors active:text-stone-200"
          >
            View source
          </a>
        )}
      </motion.div>
    </>
  );
}
