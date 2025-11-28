import { create } from 'zustand';
import type { Business, Category } from './api';

interface MapState {
  // Map center
  center: [number, number];
  zoom: number;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;

  // User location
  userLocation: [number, number] | null;
  setUserLocation: (loc: [number, number] | null) => void;

  // Selected business
  selectedBusiness: Business | null;
  setSelectedBusiness: (biz: Business | null) => void;

  // Nearby businesses
  businesses: Business[];
  setBusinesses: (businesses: Business[]) => void;

  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: Business[];
  setSearchResults: (results: Business[]) => void;

  // Route
  routeFrom: { lat: number; lng: number; name?: string } | null;
  routeTo: { lat: number; lng: number; name?: string } | null;
  routeGeometry: string | null;
  routeInfo: { distance: number; duration: number } | null;
  setRouteFrom: (from: { lat: number; lng: number; name?: string } | null) => void;
  setRouteTo: (to: { lat: number; lng: number; name?: string } | null) => void;
  setRouteGeometry: (geometry: string | null) => void;
  setRouteInfo: (info: { distance: number; duration: number } | null) => void;
  clearRoute: () => void;

  // UI state
  bottomSheetOpen: boolean;
  setBottomSheetOpen: (open: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Auth
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  user: { id: string; phone: string; name?: string; role: string } | null;
  setUser: (user: { id: string; phone: string; name?: string; role: string } | null) => void;
}

// Addis Ababa center
const ADDIS_CENTER: [number, number] = [38.7578, 9.0054];

export const useMapStore = create<MapState>((set) => ({
  center: ADDIS_CENTER,
  zoom: 13,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),

  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),

  selectedBusiness: null,
  setSelectedBusiness: (selectedBusiness) => set({ selectedBusiness, bottomSheetOpen: !!selectedBusiness }),

  businesses: [],
  setBusinesses: (businesses) => set({ businesses }),

  categories: [],
  setCategories: (categories) => set({ categories }),
  selectedCategory: null,
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  searchResults: [],
  setSearchResults: (searchResults) => set({ searchResults }),

  routeFrom: null,
  routeTo: null,
  routeGeometry: null,
  routeInfo: null,
  setRouteFrom: (routeFrom) => set({ routeFrom }),
  setRouteTo: (routeTo) => set({ routeTo }),
  setRouteGeometry: (routeGeometry) => set({ routeGeometry }),
  setRouteInfo: (routeInfo) => set({ routeInfo }),
  clearRoute: () => set({ routeFrom: null, routeTo: null, routeGeometry: null, routeInfo: null }),

  bottomSheetOpen: false,
  setBottomSheetOpen: (bottomSheetOpen) => set({ bottomSheetOpen }),
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  user: null,
  setUser: (user) => set({ user }),
}));
