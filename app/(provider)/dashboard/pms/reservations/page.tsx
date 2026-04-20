'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pmsApi } from '@/lib/pms/api';
import type { Reservation, ReservationState } from '@/lib/pms/types';
import { RESERVATION_STATE_CONFIG, CHANNEL_LABELS } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, AlertCircle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'checked_in', label: 'Check-in' },
  { value: 'checked_out', label: 'Check-out' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No show' },
];

function StateBadge({ state }: { state: ReservationState }) {
  const config = RESERVATION_STATE_CONFIG[state];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color,
      )}
    >
      {config.label}
    </span>
  );
}

export default function ReservationsListPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.set('state', stateFilter);
      const queryStr = params.toString();
      const res = await pmsApi.get<Reservation[] | { data: Reservation[] }>(
        `reservations${queryStr ? `?${queryStr}` : ''}`,
      );
      const data = Array.isArray(res) ? res : res.data;
      setReservations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading reservations');
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const filtered = search
    ? reservations.filter(
        (r) =>
          r.confirmation_code.toLowerCase().includes(search.toLowerCase()) ||
          (r.guest_name || '').toLowerCase().includes(search.toLowerCase()),
      )
    : reservations;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Reservas</h2>
        <Button size="sm" onClick={() => router.push('/dashboard/pms/reservations/new')}>
          <Plus className="mr-1 h-4 w-4" />
          Nueva reserva
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar código o huésped..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadReservations}>
            Reintentar
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search || stateFilter ? 'No se encontraron reservas con esos filtros.' : 'Aún no hay reservas.'}
          </p>
          {!search && !stateFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/pms/reservations/new')}
            >
              Crear primera reserva
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Huésped</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/pms/reservations/${r.id}`)}
                >
                  <TableCell className="font-mono text-xs">
                    {r.confirmation_code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.guest_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.room_label || '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(r.check_in).toLocaleDateString('es-VE', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(r.check_out).toLocaleDateString('es-VE', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CHANNEL_LABELS[r.channel] || r.channel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StateBadge state={r.state} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
