'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pmsApi } from '@/lib/pms/api';
import type { Guest, Reservation } from '@/lib/pms/types';
import { RESERVATION_STATE_CONFIG } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, Phone, Mail, Globe, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GuestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGuest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [guestRes, resRes] = await Promise.all([
        pmsApi.get<Guest>(`guests/${id}`),
        pmsApi.get<Reservation[] | { data: Reservation[] }>('reservations'),
      ]);
      setGuest(guestRes);
      const allRes = Array.isArray(resRes) ? resRes : resRes.data;
      setReservations((allRes || []).filter((r) => r.guest_id === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading guest');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGuest();
  }, [loadGuest]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !guest) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{guest.full_name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{guest.total_stays} estancia{guest.total_stays !== 1 ? 's' : ''}</span>
            {guest.total_spend_cents > 0 && (
              <>
                <span>·</span>
                <span>${(guest.total_spend_cents / 100).toFixed(0)} total</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {guest.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{guest.phone}</span>
              </div>
            )}
            {guest.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{guest.email}</span>
              </div>
            )}
            {guest.nationality && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{guest.nationality}</span>
              </div>
            )}
            {!guest.phone && !guest.email && !guest.nationality && (
              <p className="text-muted-foreground">Sin información de contacto.</p>
            )}

            {guest.tags && guest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {guest.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {guest.notes && (
              <div className="mt-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                {guest.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservation History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Historial de reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas.</p>
            ) : (
              <div className="space-y-2">
                {reservations.map((r) => {
                  const config = RESERVATION_STATE_CONFIG[r.state];
                  return (
                    <button
                      key={r.id}
                      onClick={() => router.push(`/dashboard/pms/reservations/${r.id}`)}
                      className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-mono text-xs">#{r.confirmation_code}</p>
                        <p className="text-sm">
                          {new Date(r.check_in).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          →{' '}
                          {new Date(r.check_out).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.bgColor, config.color)}>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
