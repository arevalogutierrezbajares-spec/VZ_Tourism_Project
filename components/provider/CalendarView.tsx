'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Booking } from '@/types/database';
import { cn } from '@/lib/utils';
import { BOOKING_STATUSES } from '@/lib/constants';

interface CalendarViewProps {
  bookings: Booking[];
  onDateClick?: (date: Date) => void;
}

export function CalendarView({ bookings, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getBookingsForDate = (day: number): Booking[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => b.check_in === dateStr);
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-background rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="font-semibold text-base">{monthName}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={prev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={next}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 border-r border-b" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayBookings = getBookingsForDate(day);
          const hasBookings = dayBookings.length > 0;

          return (
            <div
              key={day}
              className={cn(
                'h-24 border-r border-b p-1.5 cursor-pointer hover:bg-muted/30 transition-colors',
                (firstDay + i) % 7 === 0 && 'border-l-0',
                isToday(day) && 'bg-primary/5'
              )}
              onClick={() => onDateClick?.(new Date(year, month, day))}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium mb-1',
                  isToday(day) && 'bg-primary text-primary-foreground'
                )}
              >
                {day}
              </div>
              {dayBookings.slice(0, 2).map((booking) => {
                const statusConfig = BOOKING_STATUSES.find((s) => s.value === booking.status);
                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate',
                      statusConfig?.color || 'bg-blue-100 text-blue-800'
                    )}
                  >
                    {booking.tourist?.full_name?.split(' ')[0] || 'Guest'}
                  </div>
                );
              })}
              {dayBookings.length > 2 && (
                <div className="text-xs text-muted-foreground px-1">
                  +{dayBookings.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
