import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { Activity } from '@/types/activity';
import { CATEGORY_CONFIG } from '@/lib/categories';
import { deriveDisplayStatus } from '@/lib/status';
import { formatScheduleLabel, formatCheckedAt } from '@/lib/time';
import {
  BARCELONA_CENTER,
  distanceKm,
  formatDistance,
  googleMapsDirectionsUrl,
} from '@/lib/geo';
import { effectiveVerification, VERIFICATION_CONFIG } from '@/lib/verification';
import { useNowStore } from '@/store/useNowStore';
import { StatusPill } from '@/components/ui/StatusPill';
import { VerificationBadge } from '@/components/ui/VerificationBadge';

interface EventSheetProps {
  activity: Activity | null;
  now: number;
  onClose: () => void;
}

/**
 * Trust-layer bottom sheet (Apple Maps / VisionOS feel). Leads with the
 * activity, states an honest schedule + status, and always shows where the
 * information came from. Distance is from the live user location when available.
 */
export function EventSheet({ activity, now, onClose }: EventSheetProps) {
  return (
    <AnimatePresence>
      {activity && (
        <Sheet key={activity.id} activity={activity} now={now} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function Sheet({
  activity,
  now,
  onClose,
}: {
  activity: Activity;
  now: number;
  onClose: () => void;
}) {
  const userLocation = useNowStore((s) => s.userLocation);
  const category = CATEGORY_CONFIG[activity.category];
  const Icon = category.icon;
  const displayStatus = deriveDisplayStatus(activity, now);
  const verification = effectiveVerification(activity);
  const trustBlurb = VERIFICATION_CONFIG[verification].blurb;

  const origin = userLocation ?? BARCELONA_CENTER;
  const km = distanceKm(origin, activity.coordinates);
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

        {/* Header: category + status */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{
                backgroundColor: `${category.color}1f`,
                boxShadow: `inset 0 0 0 1px ${category.color}40`,
              }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} color={category.color} />
            </span>
            <span className="text-sm font-semibold" style={{ color: category.color }}>
              {category.label}
            </span>
          </div>
          <StatusPill status={displayStatus} />
        </div>

        {/* Activity-first headline */}
        <p
          className="text-xs font-bold uppercase tracking-[0.14em]"
          style={{ color: category.color }}
        >
          {activity.activityLabel}
        </p>
        <h2 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">
          {activity.title}
        </h2>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-400">
          <MapPin className="h-4 w-4" strokeWidth={2} />
          {activity.venueName} · {activity.neighborhood}
        </div>

        {/* Schedule · distance · price */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-now-soft">
            {formatScheduleLabel(activity, now)}
          </span>
          <span className="h-1 w-1 rounded-full bg-stone-600" />
          <span className="text-stone-300">{distanceLabel}</span>
          <span className="h-1 w-1 rounded-full bg-stone-600" />
          <span className="text-stone-300">{activity.priceLabel}</span>
        </div>

        {/* Trust row: verification + source + freshness */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <VerificationBadge activity={activity} now={now} showConfidence />
          <span className="text-xs text-stone-500">
            {trustBlurb} · {activity.sourceName} · {formatCheckedAt(activity.lastCheckedAt, now)}
          </span>
        </div>

        {/* Description */}
        <p className="mt-4 text-[15px] leading-relaxed text-stone-300">
          {activity.description}
        </p>

        {/* Primary CTA */}
        <a
          href={googleMapsDirectionsUrl(activity.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-now-soft to-now py-4 text-base font-extrabold text-ink-900 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-transform active:scale-[0.98]"
        >
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
          Go
        </a>

        {/* Secondary: source link only when present */}
        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 mb-1 block w-full py-3 text-center text-sm font-semibold text-stone-400 transition-colors active:text-stone-200"
          >
            View source · {activity.sourceName}
          </a>
        )}
      </motion.div>
    </>
  );
}
