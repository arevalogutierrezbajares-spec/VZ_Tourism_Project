'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  date: string;
  is_available: boolean;
  price: number | null;
  booking_id: string | null;
}

interface AvailabilityCalendarProps {
  listingId: string;
  basePrice?: number;
  onRangeSelect?: (checkIn: string, checkOut: string | null) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(year, month + n, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]!);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE, MMM d');
}

const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz

// ---------------------------------------------------------------------------
// Single-month grid
// ---------------------------------------------------------------------------

interface MonthGridProps {
  year: number;
  month: number;
  availability: Map<string, DayData>;
  checkIn: string | null;
  checkOut: string | null;
  hoverDate: string | null;
  onDayClick: (date: string) => void;
  onDayHover: (date: string | null) => void;
}

function MonthGrid({
  year,
  month,
  availability,
  checkIn,
  checkOut,
  hoverDate,
  onDayClick,
  onDayHover,
}: MonthGridProps) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rangeEnd = checkOut ?? hoverDate;

  const isInRange = (dateStr: string) => {
    if (!checkIn || !rangeEnd) return false;
    const [a, b] = checkIn <= rangeEnd ? [checkIn, rangeEnd] : [rangeEnd, checkIn];
    return dateStr > a && dateStr < b;
  };

  const isRangeStart = (dateStr: string) =>
    checkIn !== null && dateStr === checkIn;

  const isRangeEnd = (dateStr: string) =>
    rangeEnd !== null && dateStr === rangeEnd && dateStr !== checkIn;

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7" role="grid" aria-label={formatMonthLabel(year, month)}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} role="gridcell" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = isoDate(year, month, day);
          const data = availability.get(dateStr);
          const isPast = dateStr < today;
          const unavailable = isPast || (data ? !data.is_available : false);
          const inRange = isInRange(dateStr);
          const isStart = isRangeStart(dateStr);
          const isEnd = isRangeEnd(dateStr);
          const isSelected = isStart || isEnd;

          const priceLabel = data?.price !== null && data?.price !== undefined
            ? `$${data.price} per night`
            : '';
          const ariaLabel = unavailable
            ? `${format(new Date(year, month, day), 'MMMM d, yyyy')}, unavailable`
            : `${format(new Date(year, month, day), 'MMMM d, yyyy')}${priceLabel ? ', ' + priceLabel : ''}`;

          return (
            <div
              key={dateStr}
              role="gridcell"
              className={cn(
                'relative flex items-center justify-center',
                inRange && 'bg-primary/10',
                isStart && 'rounded-l-full bg-primary/10',
                isEnd && 'rounded-r-full bg-primary/10'
              )}
            >
              <button
                type="button"
                disabled={unavailable}
                aria-label={ariaLabel}
                aria-selected={isSelected}
                aria-disabled={unavailable}
                onClick={() => !unavailable && onDayClick(dateStr)}
                onMouseEnter={() => onDayHover(dateStr)}
                onMouseLeave={() => onDayHover(null)}
                className={cn(
                  'w-10 h-10 rounded-full text-sm flex flex-col items-center justify-center gap-0',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  unavailable && 'opacity-30 cursor-not-allowed line-through text-muted-foreground',
                  !unavailable && !isSelected && 'hover:bg-muted cursor-pointer',
                  isSelected && 'bg-primary text-primary-foreground font-medium',
                  dateStr === today && !isSelected && 'font-bold underline'
                )}
              >
                <span className="leading-none">{day}</span>
                {data?.price !== null && data?.price !== undefined && !unavailable && (
                  <span
                    className={cn(
                      'text-[9px] leading-none',
                      isSelected ? 'text-primary-foreground/70' : 'text-yellow-600 dark:text-yellow-400'
                    )}
                  >
                    ${data.price}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AvailabilityCalendar({
  listingId,
  basePrice,
  onRangeSelect,
  className,
}: AvailabilityCalendarProps) {
  const initialMonth = (() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  })();

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [availability, setAvailability] = useState<Map<string, DayData>>(new Map());
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Fetch availability for current month + next month (for range spans)
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    const start = isoDate(currentMonth.year, currentMonth.month, 1);
    const nextM = addMonths(currentMonth.year, currentMonth.month, 1);
    const lastDay = new Date(nextM.year, nextM.month + 1, 0).getDate();
    const end = isoDate(nextM.year, nextM.month, lastDay);

    try {
      const res = await fetch(
        `/api/listings/${listingId}/availability?start=${start}&end=${end}`
      );
      if (res.ok) {
        const d = await res.json();
        setAvailability((prev) => {
          const map = new Map(prev);
          for (const entry of d.data ?? []) {
            map.set(entry.date, entry);
          }
          return map;
        });
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [listingId, currentMonth]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ---------------------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------------------

  const handleDayClick = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      // Start new selection
      setCheckIn(date);
      setCheckOut(null);
      onRangeSelect?.(date, null);
      return;
    }
    // Second click: set check-out
    if (date <= checkIn) {
      // Clicked before check-in — restart
      setCheckIn(date);
      setCheckOut(null);
      onRangeSelect?.(date, null);
      return;
    }
    // Validate: all dates in range must be available
    const rangeDates = datesInRange(checkIn, date);
    const hasUnavailable = rangeDates.some((d) => {
      if (d === checkIn) return false;
      const entry = availability.get(d);
      return entry ? !entry.is_available : false;
    });
    if (hasUnavailable) {
      // Restart selection from clicked date
      setCheckIn(date);
      setCheckOut(null);
      onRangeSelect?.(date, null);
      return;
    }
    setCheckOut(date);
    onRangeSelect?.(checkIn, date);
  };

  const clearSelection = () => {
    setCheckIn(null);
    setCheckOut(null);
    onRangeSelect?.('', null);
  };

  // ---------------------------------------------------------------------------
  // Pricing summary
  // ---------------------------------------------------------------------------

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;

  const total = (() => {
    if (!checkIn || !checkOut || nights <= 0) return 0;
    const rangeDates = datesInRange(checkIn, checkOut).slice(0, -1); // exclude checkout day
    return rangeDates.reduce((sum, d) => {
      const entry = availability.get(d);
      return sum + (entry?.price ?? basePrice ?? 0);
    }, 0);
  })();

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const prev = () =>
    setCurrentMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const next = () =>
    setCurrentMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const canGoPrev =
    currentMonth.year > initialMonth.year ||
    currentMonth.month > initialMonth.month;

  // ---------------------------------------------------------------------------
  // Instruction bar state
  // ---------------------------------------------------------------------------

  const instructionContent = (() => {
    if (checkIn && checkOut) {
      return {
        text: `${formatDateShort(checkIn)} — ${formatDateShort(checkOut)} · ${nights} night${nights !== 1 ? 's' : ''}`,
        showClear: true,
        showTotal: total > 0,
      };
    }
    if (checkIn) {
      return {
        text: `${formatDateShort(checkIn)} → Select check-out`,
        showClear: true,
        showTotal: false,
      };
    }
    return {
      text: 'Select check-in date',
      showClear: false,
      showTotal: false,
    };
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-xl border bg-background overflow-hidden">
        {/* Instruction bar */}
        <div
          className={cn(
            'px-4 py-2.5 border-b transition-all duration-200',
            checkIn && checkOut
              ? 'bg-primary/5'
              : checkIn
                ? 'bg-amber-50 dark:bg-amber-950/30'
                : 'bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-sm transition-colors duration-200',
                checkIn && checkOut ? 'font-medium text-primary' : 'text-muted-foreground'
              )}
            >
              {instructionContent.text}
            </span>
            <div className="flex items-center gap-2">
              {instructionContent.showTotal && (
                <span className="text-sm font-semibold">${total.toFixed(2)}</span>
              )}
              {instructionContent.showClear && (
                <button
                  onClick={clearSelection}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                  aria-label="Clear date selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Calendar body */}
        <div className="p-4 space-y-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              disabled={!canGoPrev}
              className="w-8 h-8"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold">
              {formatMonthLabel(currentMonth.year, currentMonth.month)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="w-8 h-8"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Loading / Error / Calendar */}
          {loading && !availability.size ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading availability...
            </div>
          ) : fetchError && !availability.size ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-muted-foreground">Could not load availability.</p>
              <Button variant="outline" size="sm" onClick={fetchAvailability}>
                Tap to retry
              </Button>
            </div>
          ) : (
            <div className={cn(loading && 'opacity-60 transition-opacity duration-200')}>
              <MonthGrid
                year={currentMonth.year}
                month={currentMonth.month}
                availability={availability}
                checkIn={checkIn}
                checkOut={checkOut}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-3 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
              Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-muted inline-block" />
              Unavailable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              Special price
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
