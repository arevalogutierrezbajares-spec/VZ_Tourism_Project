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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapboxgl as any).accessToken = token;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map = new (mapboxgl as any).Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [lng, lat],
        zoom: 13,
        interactive: true,
        attributionControl: false,
      });

      loadTimeout = setTimeout(() => {
        if (!loadedRef.current) {
          setError(true);
          setLoaded(true);
          loadedRef.current = true;
        }
      }, 8000);

      map.on('load', () => {
        if (loadTimeout) clearTimeout(loadTimeout);
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
      if (loadTimeout) clearTimeout(loadTimeout);
      map?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-xl">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-xl z-10">
          <div className="text-center space-y-1">
            <MapPinOff className="w-5 h-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Map unavailable</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
