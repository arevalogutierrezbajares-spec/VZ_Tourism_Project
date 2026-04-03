import type { Metadata } from 'next';
import { getAllBookings } from '@/lib/bookings-store';
import { getPayouts } from '@/lib/payouts-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayoutCard } from '@/components/provider/PayoutCard';
import { PayoutMethodForm } from '@/components/provider/PayoutMethodForm';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export const metadata: Metadata = { title: 'Payouts' };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const METHOD_LABELS: Record<string, string> = {
  zelle: 'Zelle',
  usdt: 'USDT TRC-20',
  binance: 'Binance P2P',
  bank: 'Bank Transfer',
};

function getNextFriday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  return nextFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function PayoutsPage() {
  // TODO: replace with real provider session once auth is implemented
  const PROVIDER_ID = 'prov_001';

  const bookings = getAllBookings();
  const payouts = getPayouts(PROVIDER_ID);

  const pendingBalance = bookings
    .filter((b) => b.provider_id === PROVIDER_ID && b.status === 'confirmed')
    .reduce((s, b) => s + b.net_provider_usd, 0);

  const sortedPayouts = [...payouts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPaidOut = payouts
    .filter((p) => p.status === 'completed')
    .reduce((s, p) => s + p.net_amount, 0);

  const nextFriday = getNextFriday();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-muted-foreground text-sm">Manage your earnings and withdrawal preferences</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PayoutCard pendingBalance={pendingBalance} nextPayoutDate={nextFriday} />

        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid Out</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPaidOut)}</p>
            <p className="text-xs text-muted-foreground">{payouts.filter((p) => p.status === 'completed').length} completed payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Payout Schedule</p>
            <p className="text-lg font-bold">Every Friday</p>
            <p className="text-xs text-muted-foreground">Net-7 after booking completion</p>
            <p className="text-xs font-medium text-green-700">Next: {nextFriday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout method configuration */}
      <PayoutMethodForm providerId={PROVIDER_ID} />

      {/* Payout history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPayouts.length > 0 ? (
            <div className="divide-y">
              {sortedPayouts.map((payout) => {
                const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={payout.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{METHOD_LABELS[payout.method] || payout.method}</p>
                        <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5 mr-1" />
                          {cfg.label}
                        </Badge>
                        {payout.fee_usd > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Instant (1.5% fee)
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(payout.created_at)} · Ref: {payout.reference}
                      </p>
                      {payout.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {formatDate(payout.completed_at)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(payout.net_amount)}</p>
                      {payout.fee_usd > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Fee: −{formatCurrency(payout.fee_usd)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Gross: {formatCurrency(payout.amount_usd)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No payout history yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
