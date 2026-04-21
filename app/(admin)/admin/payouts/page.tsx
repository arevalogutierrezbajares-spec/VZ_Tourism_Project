import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';

export const metadata: Metadata = { title: 'Admin: Payouts' };

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  if (!supabase) return <div className="p-6 text-muted-foreground">Database not configured.</div>;

  const { data: providers } = await supabase
    .from('providers')
    .select('id, business_name, stripe_account_id, is_verified, user:users(email)');

  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('total_usd, listing_id, listing:listings(provider_id)')
    .eq('status', 'completed');

  // Build payout summary per provider
  const payoutByProvider: Record<string, { gross: number; net: number }> = {};
  completedBookings?.forEach((b) => {
    const listing = b.listing as { provider_id?: string } | null;
    const pid = listing?.provider_id;
    if (!pid) return;
    if (!payoutByProvider[pid]) payoutByProvider[pid] = { gross: 0, net: 0 };
    const gross = b.total_usd || 0;
    payoutByProvider[pid]!.gross += gross;
    payoutByProvider[pid]!.net += gross * (1 - PLATFORM_COMMISSION_RATE);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-muted-foreground text-sm">Manage provider payouts and Stripe transfers</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Provider Payout Summary</CardTitle></CardHeader>
        <CardContent>
          {providers && providers.length > 0 ? (
            <div className="space-y-3">
              {providers.map((provider) => {
                const payout = payoutByProvider[provider.id];
                const providerUser = Array.isArray(provider.user) ? provider.user[0] : provider.user;
                return (
                  <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-semibold text-sm">{provider.business_name}</p>
                      <p className="text-xs text-muted-foreground">{providerUser?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={provider.is_verified ? 'default' : 'secondary'} className="text-xs">
                          {provider.is_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        {provider.stripe_account_id ? (
                          <Badge variant="outline" className="text-xs text-status-confirmed">Stripe Connected</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-accent">No Stripe</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {payout ? (
                        <>
                          <p className="text-sm font-semibold">{formatCurrency(payout.net)} net</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(payout.gross)} gross</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No earnings</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No providers yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
