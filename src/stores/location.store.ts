import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  location: string;
  setLocation: (location: string) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: '',
      setLocation: (location) => {
        set({ location });
        console.log('📍 Location saved to localStorage:', location);
      },
    }),
    {
      name: 'location-storage',
    }
  )
);
