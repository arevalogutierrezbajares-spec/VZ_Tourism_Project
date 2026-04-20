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
  const priceLabel = pin.price != null ? formatCurrency(pin.price) : '';
  const ariaLabel = [
    pin.title,
    priceLabel && `Price: ${priceLabel}`,
    pin.rating && `Rating: ${pin.rating.toFixed(1)}`,
    pin.isVerified && 'Verified',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      onClick={() => onClick(pin)}
      className={`
        relative flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] min-w-[36px] rounded-full text-white text-xs font-bold shadow-lg
        transition-all duration-150 cursor-pointer border-2 border-white
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}
      `}
      style={{ backgroundColor: color }}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
    >
      <span>{priceLabel}</span>

      {/* Pointer */}
      <span
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
        aria-hidden="true"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${color}`,
        }}
      />
    </button>
  );
}
