import { useEffect, useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { EventSheet } from '@/components/sheet/EventSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FilterBar } from '@/components/filters/FilterBar';
import { ActivityHeader } from '@/components/header/ActivityHeader';
import { LocationPrimer } from '@/components/permission/LocationPrimer';
import { useNow } from '@/hooks/useNow';
import { useActivities } from '@/hooks/useActivities';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNowStore } from '@/store/useNowStore';
import { isEnded } from '@/lib/status';

export default function App() {
  const now = useNow();
  const activities = useActivities();
  const { request } = useGeolocation();

  const selectedActivityId = useNowStore((s) => s.selectedActivityId);
  const clearSelection = useNowStore((s) => s.clearSelection);
  const locationStatus = useNowStore((s) => s.locationStatus);
  const setLocationStatus = useNowStore((s) => s.setLocationStatus);

  const [primerDismissed, setPrimerDismissed] = useState(false);

  // Respect any prior permission decision on first load.
  useEffect(() => {
    let cancelled = false;
    const permissions = navigator.permissions;
    if (!permissions?.query) return;
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

  // Only surface a selected activity while it's still ongoing/upcoming.
  const selectedActivity = useMemo(() => {
    const a = activities.find((x) => x.id === selectedActivityId) ?? null;
    if (a && isEnded(a, now)) return null;
    return a;
  }, [activities, selectedActivityId, now]);

  const showPrimer = locationStatus === 'idle' && !primerDismissed;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-ink-900">
      <ErrorBoundary>
        <MapView activities={activities} now={now} onRequestLocation={request} />
      </ErrorBoundary>

      {/* Top scrim for legibility over a bright map. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-ink-900/85 to-transparent" />

      {/* Header + filters */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 px-5 pt-3">
        <ActivityHeader activities={activities} now={now} />
        <FilterBar />
      </div>

      {showPrimer && (
        <LocationPrimer onEnable={request} onSkip={() => setPrimerDismissed(true)} />
      )}

      <EventSheet activity={selectedActivity} now={now} onClose={clearSelection} />
    </main>
  );
}
