import { create } from 'zustand';

interface NowState {
  /** Currently selected event (opens the bottom sheet), or null. */
  selectedEventId: string | null;
  selectEvent: (id: string) => void;
  clearSelection: () => void;
}

export const useNowStore = create<NowState>((set) => ({
  selectedEventId: null,
  selectEvent: (id) => set({ selectedEventId: id }),
  clearSelection: () => set({ selectedEventId: null }),
}));
