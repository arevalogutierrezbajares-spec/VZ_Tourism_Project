'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useMapStore } from '@/stores/map-store';
import { useItineraryStore } from '@/stores/itinerary-store';
import { Loader2, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapPin } from '@/types/map';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => ({ default: m.MapContainer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs">Loading map...</span>
        </div>
      </div>
    ),
  }
);

// Day colors from DESIGN.md OKLCH palette
const DAY_COLORS = [
  '#0891b2', // teal (primary)
  '#16a34a', // green (secondary)
  '#d97706', // amber (accent)
  '#7c3aed', // violet
  '#e11d48', // rose
  '#0284c7', // sky
  '#9333ea', // purple
  '#c026d3', // fuchsia
  '#059669', // emerald
  '#ea580c', // orange
];

interface TripMapProps {
  /** Called when a stop pin is clicked */
  onStopClick?: (stopId: string) => void;
  className?: string;
}

export function TripMap({ onStopClick, className }: TripMapProps) {
  const { days } = useItineraryStore();
  const { setPins, clearRoutes, addRoute, setCenter, setZoom } = useMapStore();

  // Convert itinerary stops to map pins
  const stopPins: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    for (const day of days) {
      for (const stop of day.stops) {
        if (stop.latitude != null && stop.longitude != null) {
          pins.push({
            id: `stop-${stop.id}`,
            lat: stop.latitude,
            lng: stop.longitude,
            title: `Day ${day.day}: ${stop.title}`,
            category: 'itinerary',
            city: stop.location_name || undefined,
            listingId: stop.listing_id || undefined,
          });
        }
      }
    }
    return pins;
  }, [days]);

  // Sync pins to map store when stops change
  useEffect(() => {
    if (stopPins.length > 0) {
      setPins(stopPins);

      // Fit map to show all pins
      const lats = stopPins.map((p) => p.lat);
      const lngs = stopPins.map((p) => p.lng);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      setCenter([centerLng, centerLat]);

      // Rough zoom based on spread
      const latSpread = Math.max(...lats) - Math.min(...lats);
      const lngSpread = Math.max(...lngs) - Math.min(...lngs);
      const maxSpread = Math.max(latSpread, lngSpread);
      const zoom = maxSpread > 5 ? 5 : maxSpread > 2 ? 7 : maxSpread > 0.5 ? 9 : 11;
      setZoom(zoom);
    }
  }, [stopPins, setPins, setCenter, setZoom]);

  // Build route lines per day
  useEffect(() => {
    clearRoutes();
    for (const day of days) {
      const coords: [number, number][] = [];
      for (const stop of day.stops) {
        if (stop.latitude != null && stop.longitude != null) {
          coords.push([stop.longitude, stop.latitude]);
        }
      }
      if (coords.length >= 2) {
        addRoute({
          id: `day-${day.day}`,
          coordinates: coords,
          color: DAY_COLORS[(day.day - 1) % DAY_COLORS.length],
          width: 3,
          opacity: 0.7,
          label: `Day ${day.day}`,
        });
      }
    }
  }, [days, clearRoutes, addRoute]);

  const handlePinClick = (pin: MapPin) => {
    // Extract stop ID from pin ID (format: "stop-{stopId}")
    const stopId = pin.id.replace('stop-', '');
    onStopClick?.(stopId);
  };

  const hasStops = stopPins.length > 0;
  const daysWithStops = days.filter((d) => d.stops.some((s) => s.latitude != null && s.longitude != null));

  return (
    <div className={cn('relative w-full h-full', className)}>
      {hasStops ? (
        <>
          <MapContainer
            className="w-full h-full"
            showControls={false}
            onPinClick={handlePinClick}
          />
          {/* Day color legend — only shown when there are 2+ days with stops */}
          {daysWithStops.length >= 2 && (
            <div
              className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2 space-y-1 z-10"
              role="region"
              aria-label="Day color legend"
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Days</p>
              {daysWithStops.map((day) => (
                <div key={day.day} className="flex items-center gap-2">
                  <span
                    className="w-4 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DAY_COLORS[(day.day - 1) % DAY_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-foreground/80">Day {day.day}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-muted/20 flex items-center justify-center" role="status">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Map className="w-8 h-8 opacity-40" aria-hidden="true" />
            <p className="text-sm text-balance">Your trip will appear here</p>
            <p className="text-xs text-muted-foreground/60 text-pretty">Add stops to see them on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
