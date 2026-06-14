import { useMemo } from 'react';
import type { Activity } from '@/types/activity';
import { isEnded, isInNowTab, isTonightish } from '@/lib/status';
import { distanceKm } from '@/lib/geo';
import { isCuratedPreview, realSourceNames } from '@/lib/verification';
import { useNowStore } from '@/store/useNowStore';

interface ActivityHeaderProps {
  activities: Activity[];
  now: number;
}

const NEARBY_KM = 2;

/**
 * Activity-intelligence header. Communicates the city pulse honestly:
 * "Barcelona is alive" + factual on-now / tonight / nearby counts, plus a
 * "Curated preview" chip while the dataset is not live-verified. Never shows a
 * "live now" count it can't stand behind.
 */
export function ActivityHeader({ activities, now }: ActivityHeaderProps) {
  const userLocation = useNowStore((s) => s.userLocation);

  const { onNow, tonight, nearby, curated, sources } = useMemo(() => {
    const visible = activities.filter((a) => !a.hidden && !isEnded(a, now));
    let onNowCount = 0;
    let tonightCount = 0;
    let nearbyCount = 0;
    for (const a of visible) {
      if (isInNowTab(a, now)) onNowCount += 1;
      if (isTonightish(a, now)) tonightCount += 1;
      if (userLocation && distanceKm(userLocation, a.coordinates) <= NEARBY_KM) {
        nearbyCount += 1;
      }
    }
    return {
      onNow: onNowCount,
      tonight: tonightCount,
      nearby: nearbyCount,
      curated: isCuratedPreview(visible),
      sources: realSourceNames(visible),
    };
  }, [activities, now, userLocation]);

  return (
    <header className="pointer-events-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold tracking-tight">NOW</span>
          <span className="text-[22px] font-extrabold leading-none text-now">·</span>
          <span className="text-sm font-semibold text-stone-300">Barcelona</span>
        </div>

        {curated ? (
          <span className="rounded-full bg-ink-900/70 px-2.5 py-1 text-[11px] font-semibold text-now-soft ring-1 ring-now/30 backdrop-blur-xl">
            Curated preview
          </span>
        ) : (
          <span className="rounded-full bg-ink-900/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur-xl">
            Live · {sources.length === 1 ? sources[0] : `${sources.length} sources`}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-now" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-now" />
        </span>
        <span className="font-semibold text-stone-100">Barcelona is alive</span>
        <span className="text-stone-500">·</span>
        <span className="font-medium text-stone-300">
          {onNow} on now · {tonight} tonight
          {nearby > 0 ? ` · ${nearby} nearby` : ''}
        </span>
      </div>
    </header>
  );
}
