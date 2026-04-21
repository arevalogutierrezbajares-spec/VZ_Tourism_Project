'use client';

import { useMapStore } from '@/stores/map-store';

interface RouteLayerProps {
  isCalculating?: boolean;
}

// This component manages route rendering as a side-effect of the map store.
// Actual rendering happens inside MapContainer via mapbox-gl layers.
export function RouteLayer({ isCalculating = false }: RouteLayerProps) {
  const { routes } = useMapStore();

  if (!routes.length && !isCalculating) return null;

  return (
    <div
      className="absolute bottom-4 left-4 bg-background/90 rounded-lg p-2 shadow border text-xs space-y-1 max-w-[200px] z-10"
      role="region"
      aria-label="Route information"
    >
      {isCalculating && (
        <div className="flex items-center gap-1.5 text-muted-foreground" role="status" aria-live="polite">
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>Calculating route...</span>
        </div>
      )}
      {routes.map((route) => (
        <div key={route.id} className="flex items-center gap-1.5">
          <div
            className="w-4 h-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: route.color || '#0EA5E9' }}
            aria-hidden="true"
          />
          <span className="truncate text-foreground/80">
            {route.label || 'Route'}
            {route.durationMinutes != null && (
              <span className="ml-1 text-muted-foreground">
                {route.durationMinutes < 60
                  ? `${route.durationMinutes}min`
                  : `${Math.round(route.durationMinutes / 60)}h`}
              </span>
            )}
            {route.distanceKm != null && (
              <span className="ml-1 text-muted-foreground">
                {route.distanceKm < 1
                  ? `${Math.round(route.distanceKm * 1000)}m`
                  : `${route.distanceKm.toFixed(1)}km`}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
