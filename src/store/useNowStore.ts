import { create } from 'zustand';
import type { EventCategory, LngLat } from '@/types/activity';
import type { TimeFilter, TrustFilter } from '@/lib/filters';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

interface NowState {
  /** Currently selected activity (opens the bottom sheet), or null. */
  selectedActivityId: string | null;
  selectActivity: (id: string) => void;
  clearSelection: () => void;

  // --- Filters ---
  timeFilter: TimeFilter;
  setTimeFilter: (t: TimeFilter) => void;
  /** Empty set = all categories. */
  activeCategories: Set<EventCategory>;
  toggleCategory: (c: EventCategory) => void;
  clearCategories: () => void;
  /** Internal trust filter — not yet exposed in the UI. */
  trustFilter: TrustFilter;
  setTrustFilter: (t: TrustFilter) => void;

  // --- Geolocation ---
  userLocation: LngLat | null;
  locationStatus: LocationStatus;
  setUserLocation: (loc: LngLat | null) => void;
  setLocationStatus: (s: LocationStatus) => void;
}

export const useNowStore = create<NowState>((set) => ({
  selectedActivityId: null,
  selectActivity: (id) => set({ selectedActivityId: id }),
  clearSelection: () => set({ selectedActivityId: null }),

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
  trustFilter: 'all',
  setTrustFilter: (trustFilter) => set({ trustFilter }),

  userLocation: null,
  locationStatus: 'idle',
  setUserLocation: (userLocation) => set({ userLocation }),
  setLocationStatus: (locationStatus) => set({ locationStatus }),
}));
