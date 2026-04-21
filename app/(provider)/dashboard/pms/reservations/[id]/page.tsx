'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pmsApi, PmsApiError } from '@/lib/pms/api';
import type { Reservation, ReservationState, Folio, FolioLineItem } from '@/lib/pms/types';
import { RESERVATION_STATE_CONFIG, CHANNEL_LABELS } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Hash,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Valid state transitions
const TRANSITIONS: Partial<Record<ReservationState, { action: string; label: string; variant: 'default' | 'outline' | 'destructive' }[]>> = {
  draft: [
    { action: 'confirm', label: 'Confirmar', variant: 'default' },
    { action: 'cancel', label: 'Cancelar', variant: 'destructive' },
  ],
  pending_payment: [
    { action: 'confirm', label: 'Confirmar pago', variant: 'default' },
    { action: 'cancel', label: 'Cancelar', variant: 'destructive' },
  ],
  confirmed: [
    { action: 'check_in', label: 'Check-in', variant: 'default' },
    { action: 'cancel', label: 'Cancelar', variant: 'destructive' },
  ],
  checked_in: [
    { action: 'check_out', label: 'Check-out', variant: 'default' },
  ],
};

function StateBadge({ state }: { state: ReservationState }) {
  const config = RESERVATION_STATE_CONFIG[state];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', config.bgColor, config.color)}>
      {config.label}
    </span>
  );
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [folio, setFolio] = useState<Folio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const loadReservation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, folioRes] = await Promise.allSettled([
        pmsApi.get<Reservation>(`reservations/${id}`),
        pmsApi.get<Folio>(`folios/reservation/${id}`),
      ]);

      if (res.status === 'fulfilled') setReservation(res.value);
      else throw new Error('Reservation not found');

      if (folioRes.status === 'fulfilled') setFolio(folioRes.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading reservation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  async function handleTransition(action: string) {
    if (!reservation) return;
    setTransitioning(action);
    try {
      await pmsApi.post(`reservations/${id}/transition`, { action });
      await loadReservation();
    } catch (err) {
      const msg = err instanceof PmsApiError ? err.message : 'Transition failed';
      setError(msg);
    } finally {
      setTransitioning(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error || 'Not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const actions = TRANSITIONS[reservation.state] || [];

  const charges = folio?.line_items?.filter((li) => li.type === 'charge' && !li.voided_at) || [];
  const payments = folio?.line_items?.filter((li) => li.type === 'payment' && !li.voided_at) || [];
  const totalCharges = charges.reduce((sum, li) => sum + li.amount_cents, 0);
  const totalPayments = payments.reduce((sum, li) => sum + li.amount_cents, 0);
  const balance = totalCharges - totalPayments;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                #{reservation.confirmation_code}
              </h2>
              <StateBadge state={reservation.state} />
            </div>
            <p className="text-sm text-muted-foreground">
              {reservation.guest_name || 'Guest'}
            </p>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((a) => (
              <Button
                key={a.action}
                variant={a.variant}
                size="sm"
                disabled={transitioning !== null}
                onClick={() => handleTransition(a.action)}
              >
                {transitioning === a.action ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Reservation Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detalles de la reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {new Date(reservation.check_in).toLocaleDateString('es-VE', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {new Date(reservation.check_out).toLocaleDateString('es-VE', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {reservation.adults} adulto{reservation.adults !== 1 ? 's' : ''}
                  {reservation.children > 0 &&
                    `, ${reservation.children} niño${reservation.children !== 1 ? 's' : ''}`}
                </span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span>{nights} noche{nights !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.room_label || 'Sin asignar'}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {CHANNEL_LABELS[reservation.channel] || reservation.channel}
              </Badge>
            </div>

            {reservation.notes && (
              <div className="flex items-start gap-1.5 text-sm">
                <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">{reservation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Folio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Folio</CardTitle>
          </CardHeader>
          <CardContent>
            {!folio || folio.line_items?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos.</p>
            ) : (
              <div className="space-y-2">
                {charges.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Cargos
                    </p>
                    {charges.map((li) => (
                      <div
                        key={li.id}
                        className="flex items-center justify-between py-1 text-sm"
                      >
                        <span>{li.description}</span>
                        <span className="font-mono">
                          ${(li.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {payments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Pagos
                    </p>
                    {payments.map((li) => (
                      <div
                        key={li.id}
                        className="flex items-center justify-between py-1 text-sm text-status-confirmed"
                      >
                        <span>{li.description}</span>
                        <span className="font-mono">
                          -${(li.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span>Balance</span>
                  <span
                    className={cn(
                      'font-mono',
                      balance > 0 ? 'text-destructive' : 'text-status-confirmed',
                    )}
                  >
                    ${(balance / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
