'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import type { Availability } from '@/types/database';
import { cn } from '@/lib/utils';

interface AvailabilityCalendarProps {
  listingId: string;
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  className?: string;
}

export function AvailabilityCalendar({
  listingId,
  selectedDate,
  onDateSelect,
  className,
}: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    async function fetchAvailability() {
      const year = month.getFullYear();
      const m = month.getMonth() + 1;
      try {
        const response = await fetch(
          `/api/listings/${listingId}/availability?year=${year}&month=${m}`
        );
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
    }

    fetchAvailability();
  }, [listingId, month]);

  const isDateUnavailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availability.find((a) => a.date === dateStr);
    if (slot) return !slot.is_available || slot.booked_slots >= slot.slots;
    // Dates in the past are unavailable
    return date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const getDatePrice = (date: Date): number | null => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availability.find((a) => a.date === dateStr);
    return slot?.price_override_usd ?? null;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        month={month}
        onMonthChange={setMonth}
        disabled={isDateUnavailable}
        className="rounded-xl border"
        classNames={{
          day_selected: 'bg-primary text-primary-foreground hover:bg-primary',
          day_today: 'bg-muted font-bold',
          day_disabled: 'text-muted-foreground opacity-40 line-through',
        }}
        fromDate={new Date()}
      />
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-muted inline-block" /> Unavailable
        </span>
      </div>
    </div>
  );
}
