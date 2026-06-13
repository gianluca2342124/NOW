import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { NowEvent } from '@/types/event';
import { BARCELONA_CENTER } from '@/lib/geo';
import { deriveStatus } from '@/lib/time';
import { relevanceScore } from '@/lib/relevance';
import { visibleEventIds } from '@/lib/filters';
import { getBubbleMotion } from '@/lib/bubble';
import { useNowStore } from '@/store/useNowStore';
import { EventBubble } from './EventBubble';
import { UserLocationMarker } from './UserLocationMarker';
import { RecenterButton } from './RecenterButton';
import { MapErrorState, type MapErrorVariant } from './MapErrorState';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

interface MapViewProps {
  /** Stable list of all events — reference must NOT change every clock tick. */
  events: NowEvent[];
  now: number;
  /** Kick off (or re-request) geolocation; owned by App. */
  onRequestLocation: () => void;
}

/**
 * Mapbox GL map centered on Barcelona. Each event is a native Mapbox Marker
 * whose stable DOM container hosts a React-rendered <EventBubble> (via portal).
 *
 * Markers are created once and never torn down by the clock or filters — the
 * ticking `now`, the live user location and the active filters only update
 * bubble props / visibility. This is what keeps the map smooth.
 */
export function MapView({ events, now, onRequestLocation }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [errorVariant, setErrorVariant] = useState<MapErrorVariant | null>(
    MAPBOX_TOKEN ? null : 'missing',
  );
  const [markerNodes, setMarkerNodes] = useState<Map<string, HTMLDivElement>>(
    () => new Map(),
  );

  // Store slices
  const selectedEventId = useNowStore((s) => s.selectedEventId);
  const selectEvent = useNowStore((s) => s.selectEvent);
  const timeFilter = useNowStore((s) => s.timeFilter);
  const activeCategories = useNowStore((s) => s.activeCategories);
  const userLocation = useNowStore((s) => s.userLocation);
  const locationStatus = useNowStore((s) => s.locationStatus);

  // User-location marker plumbing
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [userNode, setUserNode] = useState<HTMLDivElement | null>(null);
  const hasAutoCenteredRef = useRef(false);

  // --- Init map once ---
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [BARCELONA_CENTER.lng, BARCELONA_CENTER.lat],
      zoom: 13,
      pitch: 45,
      bearing: -12,
      attributionControl: true,
      antialias: true,
    });
    mapRef.current = map;

    map.on('error', (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) setErrorVariant('auth');
      else if (status !== undefined && status >= 400) setErrorVariant('unknown');
    });

    map.on('load', () => {
      try {
        if (map.getLayer('water')) {
          map.setPaintProperty('water', 'fill-color', '#0a0f1a');
        }
        map.setFog({
          color: 'rgb(20, 16, 12)',
          'high-color': 'rgb(28, 20, 10)',
          'horizon-blend': 0.2,
          'space-color': 'rgb(8, 7, 6)',
          'star-intensity': 0.1,
        });
      } catch {
        // Non-fatal: stock style still looks fine without tuning.
      }
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Create one Marker per event, ONCE (stable identity, not the clock) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const markers: mapboxgl.Marker[] = [];
    const nodes = new Map<string, HTMLDivElement>();
    for (const event of events) {
      const node = document.createElement('div');
      nodes.set(event.id, node);
      const marker = new mapboxgl.Marker({ element: node, anchor: 'center' })
        .setLngLat([event.coordinates.lng, event.coordinates.lat])
        .addTo(map);
      markers.push(marker);
    }
    setMarkerNodes(nodes);

    return () => {
      markers.forEach((m) => m.remove());
      setMarkerNodes(new Map());
    };
    // `now` / filters deliberately excluded: markers must survive every tick.
  }, [events, ready]);

  // --- User-location marker: create/update/remove + first-fix auto-center ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [userLocation.lng, userLocation.lat];
    if (!userMarkerRef.current) {
      const node = document.createElement('div');
      setUserNode(node);
      userMarkerRef.current = new mapboxgl.Marker({
        element: node,
        anchor: 'center',
      })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }

    // Fly to the user only on the first fix — never yank the camera afterwards.
    if (!hasAutoCenteredRef.current) {
      hasAutoCenteredRef.current = true;
      map.flyTo({ center: lngLat, zoom: 14.5, speed: 1.2, essential: true });
    }
  }, [userLocation, ready]);

  // --- Derived per-render data (no marker churn) ---
  const statuses = useMemo(() => {
    const m = new Map<string, ReturnType<typeof deriveStatus>>();
    for (const e of events) m.set(e.id, deriveStatus(e, now));
    return m;
  }, [events, now]);

  const relevances = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.id, relevanceScore(e, now, userLocation));
    return m;
  }, [events, now, userLocation]);

  const visibleIds = useMemo(
    () => visibleEventIds(events, timeFilter, activeCategories, now),
    [events, timeFilter, activeCategories, now],
  );

  const recenter = () => {
    const map = mapRef.current;
    if (locationStatus === 'granted' && userLocation && map) {
      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14.5,
        speed: 1.2,
        essential: true,
      });
    } else {
      onRequestLocation();
    }
  };

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />

      {/* Warm vignette overlay reinforces the "NOW" mood. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(120,53,15,0.18) 100%)',
        }}
      />

      {errorVariant && <MapErrorState variant={errorVariant} />}

      {/* Empty state — subtle, never clutters the map. */}
      {!errorVariant && ready && visibleIds.size === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-8">
          <div className="glass rounded-full px-4 py-2 text-sm font-medium text-stone-300">
            Nothing here right now — try another filter
          </div>
        </div>
      )}

      {/* Recenter control */}
      {!errorVariant && (
        <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end px-4 pb-2">
          <div className="pointer-events-auto">
            <RecenterButton
              onClick={recenter}
              active={locationStatus === 'granted' && !!userLocation}
            />
          </div>
        </div>
      )}

      {/* User location marker (portaled into its Mapbox marker). */}
      {userNode && userLocation && createPortal(<UserLocationMarker />, userNode)}

      {/*
        Event bubbles portaled into stable marker nodes. Each portal wraps the
        bubble in <AnimatePresence> so filter changes animate in/out without
        unmounting the marker. Ended events (status null) simply don't render.
      */}
      {events.map((event) => {
        const node = markerNodes.get(event.id);
        const status = statuses.get(event.id);
        if (!node) return null;

        const relevance = relevances.get(event.id) ?? 0.5;
        const visible = !!status && visibleIds.has(event.id);

        // Most relevant bubbles stack above calmer ones.
        node.style.zIndex = String(getBubbleMotion(status ?? 'upcoming', relevance).zIndex);

        return createPortal(
          <AnimatePresence>
            {visible && status && (
              <EventBubble
                event={event}
                status={status}
                relevance={relevance}
                selected={selectedEventId === event.id}
                onSelect={selectEvent}
              />
            )}
          </AnimatePresence>,
          node,
          event.id,
        );
      })}
    </div>
  );
}
