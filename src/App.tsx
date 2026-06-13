import { useEffect, useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { EventSheet } from '@/components/sheet/EventSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FilterBar } from '@/components/filters/FilterBar';
import { LocationPrimer } from '@/components/permission/LocationPrimer';
import { EVENTS } from '@/data/events';
import { useNow } from '@/hooks/useNow';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNowStore } from '@/store/useNowStore';
import { deriveStatus } from '@/lib/time';

export default function App() {
  const now = useNow();
  const { request } = useGeolocation();

  const selectedEventId = useNowStore((s) => s.selectedEventId);
  const clearSelection = useNowStore((s) => s.clearSelection);
  const locationStatus = useNowStore((s) => s.locationStatus);
  const setLocationStatus = useNowStore((s) => s.setLocationStatus);

  const [primerDismissed, setPrimerDismissed] = useState(false);

  // On first load, respect any prior permission decision: auto-start if already
  // granted, stay silent if denied, otherwise let the primer invite the user.
  useEffect(() => {
    let cancelled = false;
    const permissions = navigator.permissions;
    if (!permissions?.query) return; // Safari etc. → primer handles it
    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((res) => {
        if (cancelled) return;
        if (res.state === 'granted') request();
        else if (res.state === 'denied') setLocationStatus('denied');
      })
      .catch(() => {
        /* unsupported → primer handles it */
      });
    return () => {
      cancelled = true;
    };
  }, [request, setLocationStatus]);

  // Live "N now" counter from the stable event set.
  const liveCount = useMemo(
    () =>
      EVENTS.filter((e) => {
        const s = deriveStatus(e, now);
        return s === 'live' || s === 'ending';
      }).length,
    [now],
  );

  // Only surface a selected event while it's still ongoing.
  const selectedEvent = useMemo(() => {
    const event = EVENTS.find((e) => e.id === selectedEventId) ?? null;
    if (event && deriveStatus(event, now) === null) return null;
    return event;
  }, [selectedEventId, now]);

  const showPrimer = locationStatus === 'idle' && !primerDismissed;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-ink-900">
      <ErrorBoundary>
        <MapView events={EVENTS} now={now} onRequestLocation={request} />
      </ErrorBoundary>

      {/* Top scrim for legibility over a bright map. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-ink-900/85 to-transparent" />

      {/* Header + filters */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 px-5 pt-3">
        <header className="pointer-events-auto flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-extrabold tracking-tight">NOW</span>
            <span className="text-[22px] font-extrabold leading-none text-now">·</span>
            <span className="text-sm font-semibold text-stone-300">Barcelona</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-ink-900/70 px-3 py-1.5 backdrop-blur-xl ring-1 ring-white/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-now" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-now" />
            </span>
            <span className="text-xs font-semibold text-stone-100">
              {liveCount} live now
            </span>
          </div>
        </header>

        <FilterBar />
      </div>

      {showPrimer && (
        <LocationPrimer
          onEnable={request}
          onSkip={() => setPrimerDismissed(true)}
        />
      )}

      <EventSheet event={selectedEvent} now={now} onClose={clearSelection} />
    </main>
  );
}
