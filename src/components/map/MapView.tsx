import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { NowEvent } from '@/types/event';
import { BARCELONA_CENTER } from '@/lib/geo';
import { deriveStatus } from '@/lib/time';
import { EventBubble } from './EventBubble';
import { MapErrorState, type MapErrorVariant } from './MapErrorState';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

interface MapViewProps {
  /**
   * Stable list of all events. IMPORTANT: this reference must NOT change every
   * clock tick — markers are created from it once. Live status is derived
   * per-render from `now` and applied to the (already-mounted) bubbles.
   */
  events: NowEvent[];
  now: number;
  selectedEventId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Mapbox GL map centered on Barcelona. Each event is a native Mapbox Marker
 * whose DOM container hosts a React-rendered <EventBubble> (via portal).
 *
 * Marker lifecycle is decoupled from the live clock: markers are created once
 * (keyed by stable event identity) and stay mounted. The ticking `now` only
 * updates each bubble's derived status — it never tears down a marker. This is
 * what keeps the map smooth instead of re-mounting every bubble on each tick.
 */
export function MapView({ events, now, selectedEventId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [errorVariant, setErrorVariant] = useState<MapErrorVariant | null>(
    MAPBOX_TOKEN ? null : 'missing',
  );
  // DOM nodes per event id (Marker elements + portal targets), held in state
  // so portals mount once the markers exist on the map.
  const [markerNodes, setMarkerNodes] = useState<Map<string, HTMLDivElement>>(
    () => new Map(),
  );

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

    // Graceful handling for invalid / expired tokens and other fatal errors.
    map.on('error', (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) {
        setErrorVariant('auth');
      } else if (status !== undefined && status >= 400) {
        setErrorVariant('unknown');
      }
      // Non-fatal errors (e.g. a single failed tile) are ignored on purpose.
    });

    map.on('load', () => {
      // Warm NOW tuning on top of the stock dark style.
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
    // `now` is intentionally NOT a dependency: markers must survive every tick.
  }, [events, ready]);

  // Live status per event, recomputed each tick. Cheap; updates bubble props
  // in place without remounting markers.
  const statuses = useMemo(() => {
    const map = new Map<string, ReturnType<typeof deriveStatus>>();
    for (const e of events) map.set(e.id, deriveStatus(e, now));
    return map;
  }, [events, now]);

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

      {/*
        Bubbles are portaled into stable marker nodes. A bubble whose event has
        ended (status null) renders nothing, but its marker stays mounted — no
        teardown churn. Live status updates flow in as props.
      */}
      {events.map((event) => {
        const node = markerNodes.get(event.id);
        const status = statuses.get(event.id);
        if (!node) return null;
        return createPortal(
          status ? (
            <EventBubble
              event={event}
              status={status}
              selected={selectedEventId === event.id}
              onSelect={onSelect}
            />
          ) : null,
          node,
          event.id,
        );
      })}
    </div>
  );
}
