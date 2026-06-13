import { useCallback, useEffect, useRef } from 'react';
import type { LngLat } from '@/types/event';
import { distanceKm } from '@/lib/geo';
import { useNowStore } from '@/store/useNowStore';

/** Ignore sub-threshold jitter to avoid re-render spam (~8 metres). */
const MOVE_THRESHOLD_KM = 0.008;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
};

/**
 * Live geolocation via `watchPosition`. Writes user location + permission
 * status into the store. Position updates below the movement threshold are
 * dropped so the blue dot can follow real movement without thrashing React.
 *
 * `request()` must be called from a user gesture (the primer's Enable button or
 * the recenter control) so the browser actually shows its permission prompt.
 */
export function useGeolocation() {
  const setUserLocation = useNowStore((s) => s.setUserLocation);
  const setLocationStatus = useNowStore((s) => s.setLocationStatus);
  const watchIdRef = useRef<number | null>(null);
  const lastLocRef = useRef<LngLat | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('requesting');
    stop();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: LngLat = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        };
        setLocationStatus('granted');
        if (
          !lastLocRef.current ||
          distanceKm(lastLocRef.current, loc) > MOVE_THRESHOLD_KM
        ) {
          lastLocRef.current = loc;
          setUserLocation(loc);
        }
      },
      (err) => {
        setLocationStatus(
          err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
        );
      },
      GEO_OPTIONS,
    );
  }, [setLocationStatus, setUserLocation, stop]);

  // Clean up the watch when the owner unmounts.
  useEffect(() => stop, [stop]);

  return { request };
}
