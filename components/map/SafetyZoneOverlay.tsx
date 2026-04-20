'use client';

import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useMapStore } from '@/stores/map-store';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { getSafetyColor } from '@/lib/mapbox/helpers';

const SAFETY_LABELS: Record<string, string> = {
  green: 'Safe',
  yellow: 'Caution',
  orange: 'High Caution',
  red: 'Avoid',
};

// This component shows safety zone information as an overlay panel.
// The actual map polygon rendering is handled inside MapContainer.
// Uses text labels and pattern indicators alongside color to ensure
// accessibility for color-blind users.
export function SafetyZoneOverlay() {
  const { showSafetyZones, safetyZones } = useMapStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!showSafetyZones || !safetyZones.length) return null;

  return (
    <div
      className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 rounded-lg shadow-lg p-3 max-w-[260px] space-y-2 z-10"
      role="region"
      aria-label="Safety zone information"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        aria-expanded={isExpanded}
        aria-controls="safety-zone-list"
      >
        <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          Safety Zones
        </h4>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <div id="safety-zone-list" className="space-y-1.5">
          {/* Legend key — always visible so users understand color + text mapping */}
          <div className="grid grid-cols-2 gap-1 pb-1.5 border-b border-gray-200 dark:border-gray-700">
            {(['green', 'yellow', 'orange', 'red'] as const).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: getSafetyColor(level) }}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {SAFETY_LABELS[level]}
                </span>
              </div>
            ))}
          </div>

          {/* Zone list with text labels */}
          {safetyZones.slice(0, 6).map((zone) => (
            <div key={zone.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-black/10"
                  style={{ backgroundColor: getSafetyColor(zone.level) }}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium truncate">{zone.name}</span>
              </div>
              <SafetyBadge level={zone.level} size="sm" showIcon={false} />
            </div>
          ))}
          {safetyZones.length > 6 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{safetyZones.length - 6} more zones
            </p>
          )}
        </div>
      )}
    </div>
  );
}
