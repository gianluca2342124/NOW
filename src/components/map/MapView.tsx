import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { Activity } from '@/types/activity';
import { BARCELONA_CENTER } from '@/lib/geo';
import { deriveDisplayStatus, deriveTimeState, isEnded, isTonightish } from '@/lib/status';
import { INTENSITY_BY_TIME_STATE } from '@/lib/categories';
import { pulseScore } from '@/lib/pulse';
import { passesTimeFilter, passesTrustFilter } from '@/lib/filters';
import { useNowStore } from '@/store/useNowStore';
import { ActivityBubble } from './ActivityBubble';
import { ClusterBubble } from './ClusterBubble';
import { UserLocationMarker } from './UserLocationMarker';
import { RecenterButton } from './RecenterButton';
import { MapErrorState, type MapErrorVariant } from './MapErrorState';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11';

/** Relevance-first: only the strongest activities reach the map (Phase 3). */
const MAX_MAP_ACTIVITIES = 40;

interface MapViewProps {
  activities: Activity[];
  now: number;
  onRequestLocation: () => void;
}

type LeafProps = { activityId: string; pulse: number };

interface Feature {
  key: string;
  kind: 'cluster' | 'leaf';
  lng: number;
  lat: number;
  count?: number;
  clusterId?: number;
  activityId?: string;
  intensity: number;
}

export function MapView({ activities, now, onRequestLocation }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [errorVariant, setErrorVariant] = useState<MapErrorVariant | null>(
    MAPBOX_TOKEN ? null : 'missing',
  );

  const selectedActivityId = useNowStore((s) => s.selectedActivityId);
  const selectActivity = useNowStore((s) => s.selectActivity);
  const timeFilter = useNowStore((s) => s.timeFilter);
  const activeCategories = useNowStore((s) => s.activeCategories);
  const trustFilter = useNowStore((s) => s.trustFilter);
  const userLocation = useNowStore((s) => s.userLocation);
  const locationStatus = useNowStore((s) => s.locationStatus);

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
        if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', '#0a0f1a');
        map.setFog({
          color: 'rgb(20, 16, 12)',
          'high-color': 'rgb(28, 20, 10)',
          'horizon-blend': 0.2,
          'space-color': 'rgb(8, 7, 6)',
          'star-intensity': 0.1,
        });
      } catch {
        /* non-fatal */
      }
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- User-location marker + first-fix auto-center ---
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
      userMarkerRef.current = new mapboxgl.Marker({ element: node, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }
    if (!hasAutoCenteredRef.current) {
      hasAutoCenteredRef.current = true;
      map.flyTo({ center: lngLat, zoom: 14.5, speed: 1.2, essential: true });
    }
  }, [userLocation, ready]);

  // --- Pulse-ranked candidate set + empty-state fallback (Phase 3 & 6) ---
  const { candidates, fallbackMode } = useMemo(() => {
    const alive = activities.filter((a) => !a.hidden && !isEnded(a, now));
    const inCategory = (a: Activity) =>
      activeCategories.size === 0 || activeCategories.has(a.category);
    const allowed = (a: Activity) => inCategory(a) && passesTrustFilter(a, trustFilter);

    const matched = alive.filter((a) => passesTimeFilter(a, timeFilter, now) && allowed(a));

    // The map must never feel empty: when "Now" is empty, fall back first to
    // tonight, then to anything upcoming, so real activity is always surfaced.
    let pool = matched;
    let mode: 'none' | 'tonight' | 'upcoming' = 'none';
    if (matched.length === 0 && timeFilter === 'now') {
      const tonightPool = alive.filter((a) => isTonightish(a, now) && allowed(a));
      if (tonightPool.length > 0) {
        pool = tonightPool;
        mode = 'tonight';
      } else {
        const upcomingPool = alive.filter(allowed);
        if (upcomingPool.length > 0) {
          pool = upcomingPool;
          mode = 'upcoming';
        }
      }
    }

    const ranked = pool
      .map((a) => ({ a, pulse: pulseScore(a, now, userLocation) }))
      .sort((x, y) => y.pulse - x.pulse)
      .slice(0, MAX_MAP_ACTIVITIES)
      .map((r) => r.a);

    if (import.meta.env.DEV) {
      const pulses = pool.map((a) => pulseScore(a, now, userLocation));
      // eslint-disable-next-line no-console
      console.debug('[NOW feed]', {
        totalActivities: activities.length,
        alive: alive.length,
        timeFilter,
        activeCategories: [...activeCategories],
        trustFilter,
        matched: matched.length,
        fallbackMode: mode,
        poolBeforeCap: pool.length,
        candidatesAfterCap: ranked.length,
        pulseMin: pulses.length ? Math.min(...pulses) : null,
        pulseMax: pulses.length ? Math.max(...pulses) : null,
        pulseAvg: pulses.length
          ? Math.round(pulses.reduce((s, p) => s + p, 0) / pulses.length)
          : null,
      });
      // Defensive invariant (Phase 6 task 6).
      if (alive.length > 0 && ranked.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('[NOW] invariant violated: alive>0 but 0 visible', {
          alive: alive.length,
          timeFilter,
          activeCategories: [...activeCategories],
          trustFilter,
        });
      }
    }

    return { candidates: ranked, fallbackMode: mode };
  }, [activities, now, timeFilter, activeCategories, trustFilter, userLocation]);

  const activityById = useMemo(() => {
    const m = new Map<string, Activity>();
    for (const a of candidates) m.set(a.id, a);
    return m;
  }, [candidates]);

  const pulseById = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of candidates) m.set(a.id, pulseScore(a, now, userLocation));
    return m;
  }, [candidates, now, userLocation]);

  // --- Supercluster index over candidates ---
  const index = useMemo(() => {
    const sc = new Supercluster<LeafProps>({ radius: 60, maxZoom: 16, minPoints: 2 });
    sc.load(
      candidates.map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [a.coordinates.lng, a.coordinates.lat] },
        properties: { activityId: a.id, pulse: pulseById.get(a.id) ?? 0 },
      })),
    );
    return sc;
  }, [candidates, pulseById]);

  // --- Recompute clusters on viewport change ---
  const [features, setFeatures] = useState<Feature[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const update = () => {
      const b = map.getBounds();
      if (!b) return;
      const zoom = Math.round(map.getZoom());
      const clusters = index.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        zoom,
      );
      const next: Feature[] = clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        if ((c.properties as { cluster?: boolean }).cluster) {
          const props = c.properties as Supercluster.ClusterProperties;
          const leaves = index.getLeaves(props.cluster_id, Infinity);
          const intensity =
            Math.max(0, ...leaves.map((l) => (l.properties as LeafProps).pulse)) / 100;
          return {
            key: `cluster:${props.cluster_id}`,
            kind: 'cluster',
            lng,
            lat,
            count: props.point_count,
            clusterId: props.cluster_id,
            intensity,
          };
        }
        const id = (c.properties as LeafProps).activityId;
        return {
          key: `act:${id}`,
          kind: 'leaf',
          lng,
          lat,
          activityId: id,
          intensity: (pulseById.get(id) ?? 0) / 100,
        };
      });
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[NOW clusters]', {
          clusterInputPoints: candidates.length,
          renderedFeatures: next.length,
          clusters: next.filter((f) => f.kind === 'cluster').length,
          leaves: next.filter((f) => f.kind === 'leaf').length,
          zoom: Math.round(map.getZoom()),
        });
      }
      setFeatures(next);
    };

    update();
    map.on('moveend', update);
    map.on('zoomend', update);
    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [index, ready, pulseById]);

  // --- Diff markers to match current features (cluster-aware) ---
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodes, setNodes] = useState<Map<string, HTMLDivElement>>(() => new Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markers = markersRef.current;
    const seen = new Set<string>();
    const nextNodes = new Map<string, HTMLDivElement>();

    for (const f of features) {
      seen.add(f.key);
      let marker = markers.get(f.key);
      if (!marker) {
        const node = document.createElement('div');
        nodesRef.current.set(f.key, node);
        marker = new mapboxgl.Marker({ element: node, anchor: 'center' })
          .setLngLat([f.lng, f.lat])
          .addTo(map);
        markers.set(f.key, marker);
      } else {
        marker.setLngLat([f.lng, f.lat]);
      }
      nextNodes.set(f.key, nodesRef.current.get(f.key)!);
    }
    for (const [key, marker] of markers) {
      if (!seen.has(key)) {
        marker.remove();
        markers.delete(key);
        nodesRef.current.delete(key);
      }
    }
    setNodes(nextNodes);
  }, [features, ready]);

  const expandCluster = (clusterId: number, lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = Math.min(17, index.getClusterExpansionZoom(clusterId));
    map.easeTo({ center: [lng, lat], zoom, duration: 500 });
  };

  const recenter = () => {
    const map = mapRef.current;
    if (locationStatus === 'granted' && userLocation && map) {
      map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14.5, speed: 1.2, essential: true });
    } else {
      onRequestLocation();
    }
  };

  const emptyMessage =
    candidates.length === 0
      ? 'The city is quiet right now — check back soon'
      : fallbackMode === 'tonight'
        ? "Nothing live right now — showing tonight's best"
        : fallbackMode === 'upcoming'
          ? "Nothing live right now — showing what's coming up"
          : null;

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(120,53,15,0.18) 100%)',
        }}
      />

      {errorVariant && <MapErrorState variant={errorVariant} />}

      {!errorVariant && ready && emptyMessage && (
        <div className="pointer-events-none safe-top absolute inset-x-0 top-28 flex justify-center px-8">
          <div className="glass rounded-full px-4 py-2 text-center text-sm font-medium text-stone-200">
            {emptyMessage}
          </div>
        </div>
      )}

      {!errorVariant && (
        <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end px-4 pb-2">
          <div className="pointer-events-auto">
            <RecenterButton onClick={recenter} active={locationStatus === 'granted' && !!userLocation} />
          </div>
        </div>
      )}

      {userNode && userLocation && createPortal(<UserLocationMarker />, userNode)}

      {features.map((f) => {
        const node = nodes.get(f.key);
        if (!node) return null;
        if (f.kind === 'cluster') {
          return createPortal(
            <AnimatePresence>
              <ClusterBubble
                count={f.count ?? 0}
                intensity={f.intensity}
                onClick={() => expandCluster(f.clusterId!, f.lng, f.lat)}
              />
            </AnimatePresence>,
            node,
            f.key,
          );
        }
        const activity = f.activityId ? activityById.get(f.activityId) : undefined;
        if (!activity) return null;
        const status = deriveDisplayStatus(activity, now);
        const intensity = INTENSITY_BY_TIME_STATE[deriveTimeState(activity, now)];
        return createPortal(
          <AnimatePresence>
            <ActivityBubble
              activity={activity}
              displayStatus={status}
              intensity={intensity}
              emphasis={f.intensity}
              selected={selectedActivityId === activity.id}
              onSelect={selectActivity}
            />
          </AnimatePresence>,
          node,
          f.key,
        );
      })}
    </div>
  );
}
