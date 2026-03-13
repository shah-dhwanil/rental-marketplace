import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RentalDatesState {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setDates: (startDate: string, endDate: string) => void;
  clearDates: () => void;
  getDays: () => number;
}

export const useRentalDatesStore = create<RentalDatesState>()(
  persist(
    (set, get) => ({
      startDate: "",
      endDate: "",

      setStartDate: (date) => set({ startDate: date }),
      setEndDate: (date) => set({ endDate: date }),
      setDates: (startDate, endDate) => set({ startDate, endDate }),
      clearDates: () => set({ startDate: "", endDate: "" }),

      getDays: () => {
        const { startDate, endDate } = get();
        if (!startDate || !endDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 1;
      },
    }),
    {
      name: "rental-dates-storage",
      storage: createJSONStorage(() => sessionStorage), // session only, not localStorage
    },
  ),
);
