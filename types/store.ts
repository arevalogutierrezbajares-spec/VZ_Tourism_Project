import type { Booking, Itinerary, ItineraryStop, Listing, Notification, Provider, SafetyZone, User } from './database';
import type { AIMessage } from './api';
import type { MapPin, MapRoute, MapState } from './map';

// Auth Store
export interface AuthState {
  user: User | null;
  profile: User | null;
  loading: boolean;
  initialized: boolean;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

// Map Store
export interface MapStoreState extends MapState {
  safetyZones: SafetyZone[];
  showSafetyZones: boolean;
  is3DTerrain: boolean;
  isDarkMode: boolean;
}

export interface MapStoreActions {
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  addPin: (pin: MapPin) => void;
  removePin: (id: string) => void;
  setPins: (pins: MapPin[]) => void;
  setSelectedPin: (pin: MapPin | null) => void;
  toggleSafetyZones: () => void;
  setSafetyZones: (zones: SafetyZone[]) => void;
  addRoute: (route: MapRoute) => void;
  clearRoutes: () => void;
  toggle3DTerrain: () => void;
  toggleDarkMode: () => void;
}

export type MapStore = MapStoreState & MapStoreActions;

// Itinerary Store
export interface ItineraryDay {
  day: number;
  title: string;
  stops: ItineraryStop[];
}

export interface ItineraryStoreState {
  current: Itinerary | null;
  days: ItineraryDay[];
  totalCost: number;
  isDirty: boolean;
  isSaving: boolean;
}

export interface ItineraryStoreActions {
  setItinerary: (itinerary: Itinerary) => void;
  addDay: () => void;
  removeDay: (day: number) => void;
  addStop: (stop: Omit<ItineraryStop, 'id' | 'created_at'>) => void;
  removeStop: (stopId: string) => void;
  moveStop: (stopId: string, newDay: number, newOrder: number) => void;
  updateStop: (stopId: string, data: Partial<ItineraryStop>) => void;
  calculateCost: () => void;
  save: () => Promise<void>;
  clear: () => void;
}

export type ItineraryStore = ItineraryStoreState & ItineraryStoreActions;

// Search Store
export interface SearchStoreState {
  query: string;
  filters: {
    category?: string;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    safetyLevel?: string;
    tags?: string[];
  };
  results: Listing[];
  conversationHistory: AIMessage[];
  isStreaming: boolean;
  streamingText: string;
  suggestions: string[];
  isFilterOpen: boolean;
}

export interface SearchStoreActions {
  setQuery: (query: string) => void;
  setFilters: (filters: SearchStoreState['filters']) => void;
  resetFilters: () => void;
  addMessage: (message: AIMessage) => void;
  setResults: (results: Listing[]) => void;
  startStreaming: () => void;
  appendStreamText: (text: string) => void;
  stopStreaming: () => void;
  setSuggestions: (suggestions: string[]) => void;
  clearConversation: () => void;
  toggleFilterPanel: () => void;
}

export type SearchStore = SearchStoreState & SearchStoreActions;

// Provider Store
export interface ProviderStoreState {
  provider: Provider | null;
  activeListingId: string | null;
  listings: Listing[];
  bookings: Booking[];
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

export interface ProviderStoreActions {
  setProvider: (provider: Provider | null) => void;
  setActiveListing: (id: string | null) => void;
  setListings: (listings: Listing[]) => void;
  setBookings: (bookings: Booking[]) => void;
  fetchListings: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  setUnreadCount: (count: number) => void;
}

export type ProviderStore = ProviderStoreState & ProviderStoreActions;
