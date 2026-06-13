import { useMemo } from 'react';
import { MapView } from '@/components/map/MapView';
import { EventSheet } from '@/components/sheet/EventSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EVENTS } from '@/data/events';
import { useNow } from '@/hooks/useNow';
import { useNowStore } from '@/store/useNowStore';
import { deriveStatus } from '@/lib/time';

export default function App() {
  const now = useNow();
  const selectedEventId = useNowStore((s) => s.selectedEventId);
  const selectEvent = useNowStore((s) => s.selectEvent);
  const clearSelection = useNowStore((s) => s.clearSelection);

  // Live "N now" counter. Note: we pass the *stable* EVENTS reference to the
  // map (markers are created once); status filtering happens inside the map
  // and the sheet, never by handing the map a fresh array each tick.
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

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-ink-900">
      <ErrorBoundary>
        <MapView
          events={EVENTS}
          now={now}
          selectedEventId={selectedEventId}
          onSelect={selectEvent}
        />
      </ErrorBoundary>

      {/* Brand / pulse header */}
      <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight">NOW</span>
          <span className="text-xl font-extrabold tracking-tight text-now">·</span>
          <span className="text-sm font-semibold text-stone-400">Barcelona</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-now" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-now" />
          </span>
          <span className="text-xs font-semibold text-stone-200">
            {liveCount} live now
          </span>
        </div>
      </header>

      <EventSheet event={selectedEvent} now={now} onClose={clearSelection} />
    </main>
  );
}
