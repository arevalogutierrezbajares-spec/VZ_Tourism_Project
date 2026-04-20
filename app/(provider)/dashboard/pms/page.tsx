'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pmsApi } from '@/lib/pms/api';
import { usePms } from '@/lib/pms/context';
import { RESERVATION_STATE_CONFIG } from '@/lib/pms/types';
import type { Reservation, Unit, UnitType, Guest, ReservationState } from '@/lib/pms/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewDays = 7 | 14 | 30;

const STATE_COLORS: Record<ReservationState, string> = {
  draft: 'bg-muted-foreground/60',
  pending_payment: 'bg-yellow-500',
  confirmed: 'bg-green-500',
  checked_in: 'bg-blue-500',
  checked_out: 'bg-slate-400',
  cancelled: 'bg-red-400',
  no_show: 'bg-orange-400',
};

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function daysBetween(a: string, b: string): number {
  return Math.ceil(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default function PmsCalendarPage() {
  const router = useRouter();
  const { needsOnboarding } = usePms();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Map<string, string>>(new Map());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewDays, setViewDays] = useState<ViewDays>(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endDate = useMemo(() => addDays(startDate, viewDays), [startDate, viewDays]);

  const dates = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < viewDays; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, viewDays]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [unitsRes, typesRes, reservationsRes, guestsRes] = await Promise.all([
        pmsApi.get<Unit[]>('units'),
        pmsApi.get<UnitType[]>('units/types'),
        pmsApi.get<Reservation[]>(
          `reservations?from=${formatDate(startDate)}&to=${formatDate(endDate)}`,
        ),
        pmsApi.get<Guest[]>('guests'),
      ]);

      setUnits(Array.isArray(unitsRes) ? unitsRes : []);
      setUnitTypes(Array.isArray(typesRes) ? typesRes : []);
      setReservations(Array.isArray(reservationsRes) ? reservationsRes : []);

      const guestMap = new Map<string, string>();
      const guestArr = Array.isArray(guestsRes) ? guestsRes : [];
      guestArr.forEach((g) => guestMap.set(g.id, g.full_name));
      setGuests(guestMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!needsOnboarding) loadData();
  }, [loadData, needsOnboarding]);

  if (needsOnboarding) {
    router.replace('/dashboard/pms/onboarding');
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Reintentar
        </Button>
      </div>
    );
  }

  const unitTypeMap = new Map(unitTypes.map((t) => [t.id, t.name]));
  const colWidth = viewDays <= 14 ? 100 : 48;
  const isToday = (d: Date) => formatDate(d) === formatDate(new Date());

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              setStartDate(d);
            }}
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setStartDate(addDays(startDate, -viewDays))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setStartDate(addDays(startDate, viewDays))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {startDate.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' })}
            {' — '}
            {addDays(startDate, viewDays - 1).toLocaleDateString('es-VE', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {([7, 14, 30] as ViewDays[]).map((d) => (
            <Button
              key={d}
              variant={viewDays === d ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewDays(d)}
            >
              {d}d
            </Button>
          ))}
          <Button size="sm" onClick={() => router.push('/dashboard/pms/reservations/new')}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva reserva
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {units.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay habitaciones configuradas.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/pms/settings')}
          >
            Configurar habitaciones
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <TooltipProvider>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-10 w-[160px] min-w-[160px] bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Habitación
                  </th>
                  {dates.map((d) => (
                    <th
                      key={formatDate(d)}
                      className={cn(
                        'px-1 py-2 text-center text-xs font-medium',
                        isToday(d)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground',
                        d.getDay() === 0 || d.getDay() === 6
                          ? 'bg-muted/30'
                          : '',
                      )}
                      style={{ minWidth: colWidth }}
                    >
                      <div>{d.toLocaleDateString('es-VE', { weekday: 'short' })}</div>
                      <div className="text-sm font-semibold">{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const unitReservations = reservations.filter(
                    (r) =>
                      (r.unit_id === unit.id || r.unit_type_id === unit.unit_type_id) &&
                      r.state !== 'cancelled',
                  );

                  return (
                    <tr key={unit.id} className="border-b hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-background px-3 py-2">
                        <div className="text-sm font-medium">{unit.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {unitTypeMap.get(unit.unit_type_id) || ''}
                        </div>
                      </td>
                      {dates.map((d) => {
                        const dateStr = formatDate(d);
                        const resForDay = unitReservations.find(
                          (r) => r.check_in <= dateStr && r.check_out > dateStr,
                        );

                        if (!resForDay) {
                          return (
                            <td
                              key={dateStr}
                              className={cn(
                                'border-l px-0.5 py-1',
                                isToday(d) ? 'bg-primary/5' : '',
                              )}
                            />
                          );
                        }

                        const isStart = resForDay.check_in === dateStr;
                        const isEnd =
                          formatDate(addDays(new Date(resForDay.check_out), -1)) === dateStr;
                        const guestName =
                          resForDay.guest_name ||
                          guests.get(resForDay.guest_id) ||
                          '—';
                        const config = RESERVATION_STATE_CONFIG[resForDay.state];

                        return (
                          <td
                            key={dateStr}
                            className={cn(
                              'border-l px-0 py-1',
                              isToday(d) ? 'bg-primary/5' : '',
                            )}
                          >
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/pms/reservations/${resForDay.id}`,
                                      )
                                    }
                                    className={cn(
                                      'block h-7 w-full text-xs text-white font-medium truncate px-1',
                                      STATE_COLORS[resForDay.state],
                                      isStart ? 'rounded-l-md ml-0.5' : '',
                                      isEnd ? 'rounded-r-md mr-0.5' : '',
                                    )}
                                  />
                                }
                              >
                                {isStart ? guestName : ''}
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-semibold">{guestName}</p>
                                  <p>
                                    {resForDay.check_in} → {resForDay.check_out}
                                  </p>
                                  <p>{config.label}</p>
                                  <p className="text-muted-foreground">
                                    #{resForDay.confirmation_code}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {Object.entries(RESERVATION_STATE_CONFIG).map(([state, config]) => (
          <div key={state} className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-3 w-3 rounded-sm',
                STATE_COLORS[state as ReservationState],
              )}
            />
            {config.label}
          </div>
        ))}
      </div>
    </div>
  );
}
