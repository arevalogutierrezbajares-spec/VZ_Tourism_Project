import type { DirectionsResult, GeocodingResult } from '@/types/map';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const BASE_URL = 'https://api.mapbox.com';

export async function geocode(query: string, country = 'VE'): Promise<GeocodingResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `${BASE_URL}/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=${country}&limit=5`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Geocoding failed');

  const data = await response.json();

  return data.features.map((feature: {
    place_name: string;
    center: [number, number];
    place_type: string[];
    context?: { id: string; text: string }[];
  }) => ({
    place_name: feature.place_name,
    center: feature.center,
    place_type: feature.place_type,
    context: feature.context,
  }));
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const url = `${BASE_URL}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.features.length) return null;

  const feature = data.features[0];
  return {
    place_name: feature.place_name,
    center: feature.center,
    place_type: feature.place_type,
    context: feature.context,
  };
}

export async function getDirections(
  origin: [number, number],
  destination: [number, number],
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<DirectionsResult | null> {
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  const profile = mode === 'cycling' ? 'cycling' : mode === 'walking' ? 'walking' : 'driving-traffic';
  const url = `${BASE_URL}/directions/v5/mapbox/${profile}/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&steps=true&overview=full`;

  const response = await fetch(url);
  if (!response.ok) return null;

  return response.json();
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    beaches: '🏖️',
    mountains: '⛰️',
    cities: '🏙️',
    'eco-tours': '🌿',
    gastronomy: '🍽️',
    adventure: '🧗',
    wellness: '🧘',
    cultural: '🎭',
  };
  return icons[category] || '📍';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    beaches: '#0EA5E9',
    mountains: '#6B7280',
    cities: '#8B5CF6',
    'eco-tours': '#22C55E',
    gastronomy: '#F97316',
    adventure: '#EF4444',
    wellness: '#EC4899',
    cultural: '#F59E0B',
  };
  return colors[category] || '#0EA5E9';
}

export function getSafetyColor(level: string): string {
  const colors: Record<string, string> = {
    green: '#22C55E',
    yellow: '#EAB308',
    orange: '#F97316',
    red: '#EF4444',
  };
  return colors[level] || '#6B7280';
}

export function calculateBounds(
  coordinates: { lat: number; lng: number }[]
): { north: number; south: number; east: number; west: number } | null {
  if (!coordinates.length) return null;

  let north = -90,
    south = 90,
    east = -180,
    west = 180;

  for (const coord of coordinates) {
    if (coord.lat > north) north = coord.lat;
    if (coord.lat < south) south = coord.lat;
    if (coord.lng > east) east = coord.lng;
    if (coord.lng < west) west = coord.lng;
  }

  return { north, south, east, west };
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function clusterPins<T extends { lat: number; lng: number; id: string }>(
  pins: T[],
  zoom: number
): Array<T | { isCluster: true; lat: number; lng: number; count: number; pins: T[] }> {
  if (zoom > 12) return pins;

  const clusterRadius = zoom < 8 ? 5 : zoom < 10 ? 2 : 1;
  const clusters: Array<{ lat: number; lng: number; pins: T[] }> = [];

  for (const pin of pins) {
    let added = false;
    for (const cluster of clusters) {
      const dist = haversineDistance(pin.lat, pin.lng, cluster.lat, cluster.lng);
      if (dist < clusterRadius * 10) {
        cluster.pins.push(pin);
        cluster.lat = (cluster.lat + pin.lat) / 2;
        cluster.lng = (cluster.lng + pin.lng) / 2;
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ lat: pin.lat, lng: pin.lng, pins: [pin] });
    }
  }

  return clusters.map((cluster) => {
    if (cluster.pins.length === 1) return cluster.pins[0];
    return {
      isCluster: true as const,
      lat: cluster.lat,
      lng: cluster.lng,
      count: cluster.pins.length,
      pins: cluster.pins,
    };
  });
}
