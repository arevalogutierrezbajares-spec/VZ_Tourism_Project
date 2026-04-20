'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pmsApi, PmsApiError } from '@/lib/pms/api';
import type { UnitType, Unit, Guest, ReservationChannel } from '@/lib/pms/types';
import { CHANNEL_LABELS } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewReservationPage() {
  const router = useRouter();
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Guest search
  const [guestQuery, setGuestQuery] = useState('');
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchingGuest, setSearchingGuest] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [unitTypeId, setUnitTypeId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [channel, setChannel] = useState<ReservationChannel>('web_dashboard');
  const [notes, setNotes] = useState('');

  // Availability
  const [availableUnits, setAvailableUnits] = useState<string[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [types, allUnits] = await Promise.all([
          pmsApi.get<UnitType[]>('units/types'),
          pmsApi.get<Unit[]>('units'),
        ]);
        setUnitTypes(Array.isArray(types) ? types : []);
        setUnits(Array.isArray(allUnits) ? allUnits : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Guest search with debounce
  const searchGuests = useCallback(async (q: string) => {
    if (q.length < 2) {
      setGuestResults([]);
      return;
    }
    setSearchingGuest(true);
    try {
      const res = await pmsApi.get<Guest[] | { data: Guest[] }>(
        `guests/search?q=${encodeURIComponent(q)}`,
      );
      const data = Array.isArray(res) ? res : res.data;
      setGuestResults(data || []);
    } catch {
      setGuestResults([]);
    } finally {
      setSearchingGuest(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (guestQuery.length >= 2) {
      searchTimerRef.current = setTimeout(() => searchGuests(guestQuery), 300);
    } else {
      setGuestResults([]);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [guestQuery, searchGuests]);

  // Check availability when dates + unit type change
  useEffect(() => {
    if (!unitTypeId || !checkIn || !checkOut) {
      setAvailableUnits(null);
      return;
    }
    pmsApi
      .get<string[]>(
        `reservations/availability?unit_type_id=${unitTypeId}&check_in=${checkIn}&check_out=${checkOut}`,
      )
      .then(setAvailableUnits)
      .catch(() => setAvailableUnits(null));
  }, [unitTypeId, checkIn, checkOut]);

  const filteredUnits = unitTypeId
    ? units.filter((u) => u.unit_type_id === unitTypeId && u.status === 'active')
    : [];

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const selectedType = unitTypes.find((t) => t.id === unitTypeId);
  const estimatedCost = selectedType ? (selectedType.base_rate_cents / 100) * nights : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuest || !unitTypeId || !checkIn || !checkOut) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await pmsApi.post<{ id: string; confirmation_code: string }>(
        'reservations',
        {
          guest_id: selectedGuest.id,
          unit_type_id: unitTypeId,
          unit_id: unitId || undefined,
          channel,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          notes: notes || undefined,
        },
      );
      router.push(`/dashboard/pms/reservations/${result.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof PmsApiError ? err.message : 'Error creating reservation',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Nueva reserva</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        {/* Left Column — Guest & Room */}
        <div className="space-y-4">
          {/* Guest Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Huésped</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedGuest ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                  <div>
                    <p className="font-medium">{selectedGuest.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedGuest.phone || selectedGuest.email || ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedGuest(null);
                      setGuestQuery('');
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar huésped por nombre..."
                    value={guestQuery}
                    onChange={(e) => setGuestQuery(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchingGuest && (
                    <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                  {guestResults.length > 0 && (
                    <div className="absolute top-full z-20 mt-1 w-full rounded-md border bg-background shadow-md">
                      {guestResults.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setSelectedGuest(g);
                            setGuestQuery('');
                            setGuestResults([]);
                          }}
                        >
                          <Check className="h-3 w-3 text-transparent" />
                          <div>
                            <p className="font-medium">{g.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.phone || g.email || ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room & Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Habitación y fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Tipo de habitación
                </label>
                <select
                  value={unitTypeId}
                  onChange={(e) => {
                    setUnitTypeId(e.target.value);
                    setUnitId('');
                  }}
                  required
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {unitTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ${(t.base_rate_cents / 100).toFixed(0)}/noche
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || undefined}
                    required
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  />
                </div>
              </div>

              {nights > 0 && (
                <p className="text-xs text-muted-foreground">
                  {nights} noche{nights > 1 ? 's' : ''}
                  {estimatedCost > 0 && ` — ~$${estimatedCost.toFixed(0)} USD`}
                </p>
              )}

              {filteredUnits.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Habitación específica (opcional)
                  </label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">Asignar después</option>
                    {filteredUnits.map((u) => {
                      const isAvailable =
                        availableUnits === null || availableUnits.includes(u.id);
                      return (
                        <option
                          key={u.id}
                          value={u.id}
                          disabled={!isAvailable}
                        >
                          {u.name}
                          {u.floor ? ` (Piso ${u.floor})` : ''}
                          {!isAvailable ? ' — Ocupada' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Details & Submit */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Adultos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Niños
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Canal
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ReservationChannel)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  {(
                    Object.entries(CHANNEL_LABELS) as [ReservationChannel, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre la reserva..."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!selectedGuest || !unitTypeId || !checkIn || !checkOut || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear reserva'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
