'use client';

import { useMapStore } from '@/stores/map-store';
import { SafetyBadge } from '@/components/common/SafetyBadge';

// This component shows safety zone information as an overlay panel
// The actual map polygon rendering is handled inside MapContainer
export function SafetyZoneOverlay() {
  const { showSafetyZones, safetyZones } = useMapStore();

  if (!showSafetyZones || !safetyZones.length) return null;

  return (
    <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-lg p-3 max-w-[220px] space-y-2">
      <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
        Safety Zones
      </h4>
      {safetyZones.slice(0, 4).map((zone) => (
        <div key={zone.id} className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate">{zone.name}</span>
          <SafetyBadge level={zone.level} size="sm" showIcon={false} />
        </div>
      ))}
    </div>
  );
}
