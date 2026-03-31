'use client';

import { useMapStore } from '@/stores/map-store';

// This component manages route rendering as a side-effect of the map store
// Actual rendering happens inside MapContainer via mapbox-gl layers
export function RouteLayer() {
  const { routes } = useMapStore();

  if (!routes.length) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 rounded-lg p-2 shadow text-xs space-y-1 max-w-[200px]">
      {routes.map((route) => (
        <div key={route.id} className="flex items-center gap-1.5">
          <div
            className="w-4 h-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: route.color || '#0EA5E9' }}
          />
          <span className="truncate text-foreground/80">
            {route.label || 'Route'}
            {route.durationMinutes && (
              <span className="ml-1 text-muted-foreground">
                {route.durationMinutes < 60
                  ? `${route.durationMinutes}min`
                  : `${Math.round(route.durationMinutes / 60)}h`}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
