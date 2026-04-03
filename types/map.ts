import type { SafetyLevel } from './database';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price?: number;
  currency?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  listingId?: string;
  city?: string;
  region?: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isVerified?: boolean;
}

export interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  pins: MapPin[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  opacity?: number;
  label?: string;
  durationMinutes?: number;
  distanceKm?: number;
  mode?: 'driving' | 'walking' | 'cycling';
}

export interface SafetyZoneOverlay {
  id: string;
  name: string;
  level: SafetyLevel;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  color: string;
  opacity: number;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pins: MapPin[];
  routes: MapRoute[];
  selectedPin: MapPin | null;
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface GeocodingResult {
  place_name: string;
  center: [number, number];
  place_type: string[];
  context?: {
    id: string;
    text: string;
  }[];
}

export interface DirectionsResult {
  routes: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
    legs: {
      summary: string;
      distance: number;
      duration: number;
      steps: {
        instruction: string;
        distance: number;
        duration: number;
      }[];
    }[];
  }[];
}

export type MapTheme = 'streets' | 'satellite' | 'dark' | 'light' | 'outdoors';

export interface MapSettings {
  theme: MapTheme;
  show3DTerrain: boolean;
  showSafetyZones: boolean;
  showClusters: boolean;
  showRoutes: boolean;
}
