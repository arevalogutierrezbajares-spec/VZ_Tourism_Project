'use client';

import { useEffect, useState, useCallback } from 'react';
import { pmsApi, PmsApiError } from '@/lib/pms/api';
import type { Payment } from '@/lib/pms/types';
import { PAYMENT_METHOD_LABELS } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'pending' | 'all';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  matched: { label: 'Conciliado', color: 'text-green-700', bg: 'bg-green-100' },
  unmatched: { label: 'Sin conciliar', color: 'text-red-700', bg: 'bg-red-100' },
  reversed: { label: 'Reversado', color: 'text-slate-700', bg: 'bg-slate-100' },
};

function PaymentStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.color)}>
      {config.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700',
      )}
    >
      {pct}%
    </span>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<Payment[]>([]);
  const [all, setAll] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, allRes] = await Promise.all([
        pmsApi.get<{ data: Payment[] } | Payment[]>('payments/pending'),
        pmsApi.get<{ data: Payment[] } | Payment[]>('payments'),
      ]);
      const pendingData = Array.isArray(pendingRes) ? pendingRes : pendingRes.data;
      const allData = Array.isArray(allRes) ? allRes : allRes.data;
      setPending(pendingData || []);
      setAll(allData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function handleMatch(paymentId: string) {
    setActionLoading(paymentId);
    try {
      await pmsApi.post(`payments/${paymentId}/match`);
      await loadPayments();
    } catch {
      // Silently handle
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(paymentId: string) {
    setActionLoading(`reject-${paymentId}`);
    try {
      await pmsApi.post(`payments/${paymentId}/reject`);
      await loadPayments();
    } catch {
      // Silently handle
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pagos</h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {([
          { key: 'pending' as Tab, label: 'Pendientes', count: pending.length },
          { key: 'all' as Tab, label: 'Todos', count: all.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {t.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadPayments}>
            Reintentar
          </Button>
        </div>
      ) : tab === 'pending' ? (
        /* Pending Payments */
        pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
            <Check className="h-8 w-8 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No hay pagos pendientes de conciliar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          ${(p.amount_cents / 100).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_METHOD_LABELS[p.method] || p.method}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.sender_name}
                        {p.reference && (
                          <span className="ml-2 font-mono text-xs">
                            Ref: {p.reference}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('es-VE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Match candidates */}
                    {p.match_candidates && p.match_candidates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Coincidencias sugeridas:
                        </p>
                        {p.match_candidates.map((mc) => (
                          <div
                            key={mc.reservation_id}
                            className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
                          >
                            <div className="flex-1 text-sm">
                              <span className="font-mono text-xs">
                                #{mc.confirmation_code}
                              </span>
                              <span className="ml-2">{mc.guest_name}</span>
                            </div>
                            <ConfidenceBadge confidence={mc.confidence} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={actionLoading !== null}
                              onClick={() => handleMatch(p.id)}
                            >
                              {actionLoading === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={actionLoading !== null}
                              onClick={() => handleReject(p.id)}
                            >
                              {actionLoading === `reject-${p.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* All Payments */
        all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Remitente</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">
                      {new Date(p.created_at).toLocaleDateString('es-VE', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      ${(p.amount_cents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_METHOD_LABELS[p.method] || p.method}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.sender_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.reference || '—'}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}
    </div>
  );
}
