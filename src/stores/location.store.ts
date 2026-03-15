import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  location: string;
  lat: number | null;
  lng: number | null;
  setLocation: (location: string) => void;
  setCoords: (lat: number, lng: number) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: '',
      lat: null,
      lng: null,
      setLocation: (location) => set({ location }),
      setCoords: (lat, lng) => set({ lat, lng }),
      clearLocation: () => set({ location: '', lat: null, lng: null }),
    }),
    {
      name: 'location-storage',
    }
  )
);
