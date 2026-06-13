import { create } from 'zustand';
import type { EventCategory, LngLat } from '@/types/event';
import type { TimeFilter } from '@/lib/filters';

export type LocationStatus =
  | 'idle' // not asked yet (primer can show)
  | 'requesting' // native prompt in flight
  | 'granted'
  | 'denied'
  | 'unavailable';

interface NowState {
  /** Currently selected event (opens the bottom sheet), or null. */
  selectedEventId: string | null;
  selectEvent: (id: string) => void;
  clearSelection: () => void;

  // --- Filters ---
  timeFilter: TimeFilter;
  setTimeFilter: (t: TimeFilter) => void;
  /** Empty set = all categories. */
  activeCategories: Set<EventCategory>;
  toggleCategory: (c: EventCategory) => void;
  clearCategories: () => void;

  // --- Geolocation ---
  userLocation: LngLat | null;
  locationStatus: LocationStatus;
  setUserLocation: (loc: LngLat | null) => void;
  setLocationStatus: (s: LocationStatus) => void;
}

export const useNowStore = create<NowState>((set) => ({
  selectedEventId: null,
  selectEvent: (id) => set({ selectedEventId: id }),
  clearSelection: () => set({ selectedEventId: null }),

  timeFilter: 'now',
  setTimeFilter: (timeFilter) => set({ timeFilter }),
  activeCategories: new Set<EventCategory>(),
  toggleCategory: (c) =>
    set((state) => {
      const next = new Set(state.activeCategories);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { activeCategories: next };
    }),
  clearCategories: () => set({ activeCategories: new Set<EventCategory>() }),

  userLocation: null,
  locationStatus: 'idle',
  setUserLocation: (userLocation) => set({ userLocation }),
  setLocationStatus: (locationStatus) => set({ locationStatus }),
}));
