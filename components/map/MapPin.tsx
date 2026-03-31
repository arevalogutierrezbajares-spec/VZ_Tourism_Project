'use client';

import type { MapPin as MapPinType } from '@/types/map';
import { getCategoryColor } from '@/lib/mapbox/helpers';
import { formatCurrency } from '@/lib/utils';

interface Props {
  pin: MapPinType;
  isSelected: boolean;
  onClick: (pin: MapPinType) => void;
}

export function MapPin({ pin, isSelected, onClick }: Props) {
  const color = getCategoryColor(pin.category ?? 'default');

  return (
    <button
      onClick={() => onClick(pin)}
      className={`
        relative flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg
        transition-all duration-150 cursor-pointer border-2 border-white
        ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}
      `}
      style={{ backgroundColor: color }}
      aria-label={pin.title}
    >
      <span>{pin.price != null ? formatCurrency(pin.price) : ''}</span>

      {/* Pointer */}
      <span
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${color}`,
        }}
      />
    </button>
  );
}
