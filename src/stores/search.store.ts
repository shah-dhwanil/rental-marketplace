import { create } from "zustand";

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sortBy?: string;
  location?: string;
  radius?: number;
}

interface SearchState {
  query: string;
  filters: SearchFilters;
  recentSearches: string[];
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: (key: keyof SearchFilters, value: any) => void;
  clearFilters: () => void;
  addToRecentSearches: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: "",
  filters: {},
  recentSearches: [],
  
  setQuery: (query) => {
    set({ query });
  },
  
  setFilters: (filters) => {
    set({ filters });
  },
  
  updateFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
  },
  
  clearFilters: () => {
    set({ filters: {} });
  },
  
  addToRecentSearches: (query) => {
    set((state) => {
      const cleaned = query.trim();
      if (!cleaned) return state;
      
      // Remove duplicates and limit to 10
      const updated = [
        cleaned,
        ...state.recentSearches.filter(q => q !== cleaned),
      ].slice(0, 10);
      
      return { recentSearches: updated };
    });
  },
  
  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));
