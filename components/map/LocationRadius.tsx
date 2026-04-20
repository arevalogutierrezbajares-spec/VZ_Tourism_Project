'use client';

import { MapPin } from 'lucide-react';

interface LocationRadiusProps {
  lat: number;
  lng: number;
  radiusKm: number;
  color?: string;
  opacity?: number;
  /** Optional label shown alongside the radius indicator */
  label?: string;
}

// Renders a small UI indicator showing the selected radius.
// Actual circle rendering on the Mapbox canvas is managed by MapContainer
// via a GeoJSON source + fill/line layer added in a useEffect.
export function LocationRadius({
  radiusKm,
  color = '#0EA5E9',
  label,
}: LocationRadiusProps) {
  return (
    <div
      className="absolute bottom-20 right-4 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2"
      role="status"
      aria-label={`Search radius: ${radiusKm} kilometers`}
    >
      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color }} aria-hidden="true" />
      <div className="text-xs">
        <span className="font-medium text-foreground">
          {label ?? 'Radius'}
        </span>
        <span className="text-muted-foreground ml-1.5">
          {radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`}
        </span>
      </div>
      <div
        className="w-3 h-3 rounded-full border-2 flex-shrink-0"
        style={{ borderColor: color, backgroundColor: `${color}33` }}
        aria-hidden="true"
      />
    </div>
  );
}
