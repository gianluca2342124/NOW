import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { NowEvent } from '@/types/event';
import { BARCELONA_CENTER } from '@/lib/geo';
import { deriveStatus } from '@/lib/time';
import { EventBubble } from './EventBubble';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

interface MapViewProps {
  events: NowEvent[];
  now: number;
  selectedEventId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Mapbox GL map centered on Barcelona. Each event is a native Mapbox Marker
 * whose DOM container hosts a React-rendered <EventBubble> (via portal). This
 * keeps Mapbox handling geo-positioning while React/Framer owns the animation.
 */
export function MapView({ events, now, selectedEventId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
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

  // --- Create one Marker per event (geo-position only) ---
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
  }, [events, ready]);

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

      {!MAPBOX_TOKEN && <MissingTokenOverlay />}

      {/* React bubbles portaled into their Mapbox marker containers. */}
      {events.map((event) => {
        const node = markerNodes.get(event.id);
        const status = statuses.get(event.id);
        if (!node || !status) return null;
        return createPortal(
          <EventBubble
            key={event.id}
            event={event}
            status={status}
            selected={selectedEventId === event.id}
            onSelect={onSelect}
          />,
          node,
        );
      })}
    </div>
  );
}

function MissingTokenOverlay() {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-ink-900 px-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-gradient-to-b from-now-soft to-now-deep" />
        <h1 className="text-2xl font-extrabold tracking-tight">NOW</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          Add a Mapbox public token to see the city come alive. Create a{' '}
          <code className="rounded bg-ink-700 px-1.5 py-0.5 text-now-soft">
            .env
          </code>{' '}
          file with{' '}
          <code className="rounded bg-ink-700 px-1.5 py-0.5 text-now-soft">
            VITE_MAPBOX_TOKEN
          </code>
          , then restart the dev server.
        </p>
      </div>
    </div>
  );
}
