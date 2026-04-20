'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPinOff } from 'lucide-react';

interface ListingMapProps {
  lat: number;
  lng: number;
  title: string;
  className?: string;
}

export function ListingMap({ lat, lng, title, className = 'w-full h-48 rounded-xl overflow-hidden' }: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError(true);
      setLoaded(true);
      return;
    }

    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');

      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapboxgl as any).accessToken = token;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new (mapboxgl as any).Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [lng, lat],
        zoom: 13,
        interactive: true,
        attributionControl: false,
      });

      mapRef.current = map;

      loadTimeout = setTimeout(() => {
        if (!loadedRef.current) {
          setError(true);
          setLoaded(true);
          loadedRef.current = true;
        }
      }, 8000);

      map.on('load', () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (mapboxgl as any).Marker({ color: '#0ea5e9' })
          .setLngLat([lng, lat])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .setPopup(new (mapboxgl as any).Popup({ offset: 25 }).setText(title))
          .addTo(map);

        setLoaded(true);
        loadedRef.current = true;
      });

      map.on('error', () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        setError(true);
        setLoaded(true);
      });
    }

    init().catch(() => {
      setError(true);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      // Properly clean up map instance to prevent memory leaks
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className={`relative ${className}`} role="region" aria-label={`Map showing location of ${title}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-xl" role="status" aria-live="polite">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading map...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-xl z-10" role="alert">
          <div className="text-center space-y-1">
            <MapPinOff className="w-5 h-5 text-muted-foreground mx-auto" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Map unavailable</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
