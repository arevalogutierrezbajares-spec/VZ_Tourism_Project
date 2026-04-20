'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, DollarSign, Lock, Unlock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  date: string; // YYYY-MM-DD
  is_available: boolean;
  price: number | null;
  booking_id: string | null;
  blocked_reason: string | null;
}

interface BookingDetail {
  id: string;
  listing_id: string;
  tourist?: { full_name?: string };
  listing?: { title?: string };
  check_in: string;
  check_out: string | null;
  guests: number;
  total_usd: number;
  status: string;
}

type SelectionState =
  | { mode: 'idle' }
  | { mode: 'dragging'; start: string; end: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function datesInRange(a: string, b: string): string[] {
  const dates: string[] = [];
  const start = new Date(a < b ? a : b);
  const end = new Date(a < b ? b : a);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]!);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0]!;
}

// ---------------------------------------------------------------------------
// Day cell color
// ---------------------------------------------------------------------------

function dayColor(day: DayData | undefined, today: string): string {
  if (!day) return 'hover:bg-muted/40';
  if (day.booking_id && day.booking_id !== 'booking_hold') {
    return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50';
  }
  if (!day.is_available) {
    return 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-800';
  }
  if (day.price !== null) {
    return 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
  }
  return 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20';
}

// ---------------------------------------------------------------------------
// Modal components
// ---------------------------------------------------------------------------

function BlockModal({
  selectedDates,
  onConfirm,
  onClose,
}: {
  selectedDates: string[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('personal');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="block-dates-title">
      <div className="bg-background rounded-xl border p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="block-dates-title" className="font-semibold">Block Dates</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close dialog">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedDates.length === 1
            ? `Block ${selectedDates[0]}`
            : `Block ${selectedDates.length} dates (${selectedDates[0]} – ${selectedDates[selectedDates.length - 1]})`}
        </p>
        <div className="space-y-2">
          <label htmlFor="block-reason" className="text-sm font-medium">Reason</label>
          <select
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          >
            <option value="personal">Personal</option>
            <option value="maintenance">Maintenance</option>
            <option value="holiday">Holiday</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(reason)}>Block</Button>
        </div>
      </div>
    </div>
  );
}

function PriceModal({
  selectedDates,
  onConfirm,
  onClose,
}: {
  selectedDates: string[];
  onConfirm: (price: number) => void;
  onClose: () => void;
}) {
  const [price, setPrice] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="price-override-title">
      <div className="bg-background rounded-xl border p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="price-override-title" className="font-semibold">Set Price Override</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close dialog">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedDates.length === 1
            ? `Set price for ${selectedDates[0]}`
            : `Set price for ${selectedDates.length} dates`}
        </p>
        <div className="space-y-2">
          <label htmlFor="price-override" className="text-sm font-medium">Price per night (USD)</label>
          <input
            id="price-override"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 150"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!price || Number(price) <= 0}
            onClick={() => onConfirm(Number(price))}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: BookingDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
      <div className="bg-background rounded-xl border p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 id="booking-detail-title" className="font-semibold">Booking Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close dialog">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guest</span>
            <span className="font-medium">{booking.tourist?.full_name ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Listing</span>
            <span className="font-medium">{booking.listing?.title ?? booking.listing_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in</span>
            <span>{booking.check_in}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out</span>
            <span>{booking.check_out ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guests</span>
            <span>{booking.guests}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">${booking.total_usd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
              {booking.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const today = todayStr();
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [availability, setAvailability] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(false);

  // Listing selector (provider may have multiple listings)
  const [listings, setListings] = useState<{ id: string; title: string }[]>([]);
  const [selectedListing, setSelectedListing] = useState<string>('');

  // Drag selection
  const [selection, setSelection] = useState<SelectionState>({ mode: 'idle' });
  const isDragging = useRef(false);

  // Modals
  const [blockModal, setBlockModal] = useState<string[] | null>(null);
  const [priceModal, setPriceModal] = useState<string[] | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);

  // Sidebar: today's check-ins/outs
  const [todayCheckIns, setTodayCheckIns] = useState<BookingDetail[]>([]);
  const [todayCheckOuts, setTodayCheckOuts] = useState<BookingDetail[]>([]);

  // ---------------------------------------------------------------------------
  // Fetch listings on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetch('/api/provider/listings')
      .then((r) => r.json())
      .then((d) => {
        const list = d.data ?? [];
        setListings(list);
        if (list.length > 0) setSelectedListing(list[0].id);
      })
      .catch(() => {
        // Fallback: use a placeholder when API is unavailable
        setListings([{ id: 'demo-listing', title: 'Demo Listing' }]);
        setSelectedListing('demo-listing');
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch availability whenever listing or month changes
  // ---------------------------------------------------------------------------
  const fetchAvailability = useCallback(async () => {
    if (!selectedListing) return;
    setLoading(true);
    const { year, month } = currentDate;
    const start = isoDate(year, month, 1);
    // Fetch a few extra days on either side for display
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = isoDate(year, month, lastDay);

    try {
      const res = await fetch(
        `/api/listings/${selectedListing}/availability?start=${start}&end=${end}`
      );
      const json = await res.json();
      const map = new Map<string, DayData>();
      for (const entry of json.data ?? []) {
        map.set(entry.date, entry);
      }
      setAvailability(map);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [selectedListing, currentDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ---------------------------------------------------------------------------
  // Fetch today's activity
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedListing) return;
    fetch(`/api/provider/bookings?listing_id=${selectedListing}&date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        setTodayCheckIns(d.check_ins ?? []);
        setTodayCheckOuts(d.check_outs ?? []);
      })
      .catch(() => {
        setTodayCheckIns([]);
        setTodayCheckOuts([]);
      });
  }, [selectedListing, today]);

  // ---------------------------------------------------------------------------
  // Calendar navigation
  // ---------------------------------------------------------------------------
  const prevMonth = () =>
    setCurrentDate(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const nextMonth = () =>
    setCurrentDate(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  // ---------------------------------------------------------------------------
  // Grid data
  // ---------------------------------------------------------------------------
  const { year, month } = currentDate;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const occupiedDays = Array.from(availability.values()).filter(
    (d) => d.booking_id && d.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  ).length;
  const occupancyRate =
    daysInMonth > 0 ? Math.round((occupiedDays / daysInMonth) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------
  const getSelectedDates = (): string[] => {
    if (selection.mode !== 'dragging') return [];
    return datesInRange(selection.start, selection.end);
  };

  const isSelected = (dateStr: string) => {
    if (selection.mode !== 'dragging') return false;
    const [a, b] = [selection.start, selection.end].sort();
    return dateStr >= a! && dateStr <= b!;
  };

  // ---------------------------------------------------------------------------
  // Mouse interaction
  // ---------------------------------------------------------------------------
  const handleDayMouseDown = (dateStr: string, dayData: DayData | undefined) => {
    if (dayData?.booking_id) {
      // Show booking detail instead of starting selection
      fetchBookingDetail(dayData.booking_id);
      return;
    }
    isDragging.current = true;
    setSelection({ mode: 'dragging', start: dateStr, end: dateStr });
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if (!isDragging.current) return;
    setSelection((prev) =>
      prev.mode === 'dragging' ? { ...prev, end: dateStr } : prev
    );
  };

  const handleDayMouseUp = () => {
    isDragging.current = false;
  };

  const handleDayClick = (dateStr: string, dayData: DayData | undefined) => {
    if (dayData?.booking_id && dayData.booking_id !== 'booking_hold') {
      fetchBookingDetail(dayData.booking_id);
    }
  };

  const fetchBookingDetail = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const d = await res.json();
        setBookingDetail(d.data ?? null);
      }
    } catch {
      // ignore
    }
  };

  // ---------------------------------------------------------------------------
  // Actions on selected dates
  // ---------------------------------------------------------------------------
  const postDates = async (
    dates: string[],
    body: Record<string, unknown>
  ) => {
    await fetch(`/api/listings/${selectedListing}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates, ...body }),
    });
    await fetchAvailability();
    setSelection({ mode: 'idle' });
  };

  const handleBlockConfirm = async (reason: string) => {
    if (!blockModal) return;
    await postDates(blockModal, { is_available: false, reason });
    setBlockModal(null);
  };

  const handleUnblock = async () => {
    const dates = getSelectedDates();
    if (!dates.length) return;
    await postDates(dates, { is_available: true });
  };

  const handlePriceConfirm = async (price: number) => {
    if (!priceModal) return;
    await postDates(priceModal, { is_available: true, price_override: price });
    setPriceModal(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const selectedDates = getSelectedDates();
  const hasSelection = selectedDates.length > 0;

  return (
    <div
      className="flex flex-col gap-6 select-none"
      onMouseUp={handleDayMouseUp}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground text-sm">
          Manage availability, pricing, and blocked dates
        </p>
      </div>

      {/* Listing selector */}
      {listings.length > 1 && (
        <select
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm bg-background w-72"
          aria-label="Select listing"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-6 items-start">
        {/* ------------------------------------------------------------------ */}
        {/* Calendar grid                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 min-w-0">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-semibold text-base">
              {formatMonthYear(year, month)}
              {loading && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  Loading…
                </span>
              )}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Action buttons (visible when dates are selected) */}
          {hasSelection && (
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="text-sm text-muted-foreground self-center">
                {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBlockModal(selectedDates)}
              >
                <Lock className="w-3 h-3 mr-1" /> Block
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnblock}
              >
                <Unlock className="w-3 h-3 mr-1" /> Unblock
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPriceModal(selectedDates)}
              >
                <DollarSign className="w-3 h-3 mr-1" /> Set Price
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelection({ mode: 'idle' })}
              >
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 border-t border-l rounded-xl overflow-hidden">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`pad-${i}`}
                className="h-20 border-r border-b bg-muted/10"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = isoDate(year, month, day);
              const data = availability.get(dateStr);
              const isToday = dateStr === today;
              const selected = isSelected(dateStr);

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'h-20 border-r border-b p-1.5 cursor-pointer transition-colors',
                    selected
                      ? 'bg-primary/20 ring-inset ring-2 ring-primary'
                      : dayColor(data, today),
                    isToday && !selected && 'ring-inset ring-2 ring-primary/40'
                  )}
                  onMouseDown={() => handleDayMouseDown(dateStr, data)}
                  onMouseEnter={() => handleDayMouseEnter(dateStr)}
                  onClick={() => handleDayClick(dateStr, data)}
                >
                  {/* Day number */}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                      isToday && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {day}
                  </div>

                  {/* Indicator chips */}
                  {data?.booking_id && data.booking_id !== 'booking_hold' && (
                    <div className="text-[10px] bg-blue-500 text-white rounded px-1 truncate">
                      Booked
                    </div>
                  )}
                  {data?.booking_id === 'booking_hold' && (
                    <div className="text-[10px] bg-orange-400 text-white rounded px-1 truncate">
                      Hold
                    </div>
                  )}
                  {!data?.booking_id && !data?.is_available && data && (
                    <div className="text-[10px] bg-gray-400 text-white rounded px-1 truncate">
                      {data.blocked_reason ?? 'Blocked'}
                    </div>
                  )}
                  {data?.price !== null && data?.price !== undefined && data?.is_available && (
                    <div className="text-[10px] text-yellow-700 dark:text-yellow-400 font-medium">
                      ${data.price}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap text-xs text-muted-foreground">
            <LegendItem color="bg-green-100 dark:bg-green-900/30" label="Available" />
            <LegendItem color="bg-blue-100 dark:bg-blue-900/30" label="Booked" />
            <LegendItem color="bg-gray-100 dark:bg-gray-800/60" label="Blocked" />
            <LegendItem color="bg-yellow-50 dark:bg-yellow-900/20" label="Price override" />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Sidebar                                                             */}
        {/* ------------------------------------------------------------------ */}
        <div className="hidden lg:block w-64 shrink-0 space-y-4">
          {/* Occupancy */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                Occupancy ({occupiedDays}/{daysInMonth} days booked)
              </p>
            </CardContent>
          </Card>

          {/* Today's check-ins */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today&rsquo;s Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              {todayCheckIns.length === 0 ? (
                <p className="text-xs text-muted-foreground">None today</p>
              ) : (
                <ul className="space-y-1">
                  {todayCheckIns.map((b) => (
                    <li key={b.id} className="text-xs">
                      <span className="font-medium">{b.tourist?.full_name ?? 'Guest'}</span>
                      {' — '}
                      {b.guests} guest{b.guests !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Today's check-outs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today&rsquo;s Check-outs</CardTitle>
            </CardHeader>
            <CardContent>
              {todayCheckOuts.length === 0 ? (
                <p className="text-xs text-muted-foreground">None today</p>
              ) : (
                <ul className="space-y-1">
                  {todayCheckOuts.map((b) => (
                    <li key={b.id} className="text-xs">
                      <span className="font-medium">{b.tourist?.full_name ?? 'Guest'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick help */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Click and drag to select a date range, then block, unblock, or set a price override.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Modals                                                                */}
      {/* -------------------------------------------------------------------- */}
      {blockModal && (
        <BlockModal
          selectedDates={blockModal}
          onConfirm={handleBlockConfirm}
          onClose={() => setBlockModal(null)}
        />
      )}
      {priceModal && (
        <PriceModal
          selectedDates={priceModal}
          onConfirm={handlePriceConfirm}
          onClose={() => setPriceModal(null)}
        />
      )}
      {bookingDetail && (
        <BookingDetailModal
          booking={bookingDetail}
          onClose={() => setBookingDetail(null)}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('w-3 h-3 rounded-sm inline-block border', color)} />
      {label}
    </span>
  );
}
