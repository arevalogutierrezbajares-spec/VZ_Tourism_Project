'use client';

import { useState } from 'react';
import { Wallet, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface PayoutCardProps {
  pendingBalance: number;
  nextPayoutDate: string;
}

const INSTANT_FEE_RATE = 0.015;

export function PayoutCard({ pendingBalance, nextPayoutDate }: PayoutCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const fee = Math.round(pendingBalance * INSTANT_FEE_RATE * 100) / 100;
  const net = Math.round((pendingBalance - fee) * 100) / 100;

  async function handleInstantPayout() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: 'prov_001',
          method: 'zelle',
          method_details: {},
          instant: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Payout request failed');
      toast.success(`Instant payout of ${formatCurrency(net)} requested!`);
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Payout Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Pending Balance</p>
            <p className="text-2xl font-bold text-status-confirmed">{formatCurrency(pendingBalance)}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting payout
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Next scheduled payout</span>
          <span className="font-medium">{nextPayoutDate}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Schedule</span>
          <span className="font-medium">Every Friday (net-7)</span>
        </div>

        {pendingBalance > 0 && (
          <div className="pt-2 space-y-2">
            {confirming ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Confirm instant payout</p>
                    <p className="text-muted-foreground mt-1">
                      Amount: <span className="font-semibold">{formatCurrency(pendingBalance)}</span><br />
                      Fee (1.5%): <span className="font-semibold text-destructive">−{formatCurrency(fee)}</span><br />
                      You receive: <span className="font-semibold text-status-confirmed">{formatCurrency(net)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstantPayout} disabled={loading} className="flex-1">
                    {loading ? 'Processing…' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleInstantPayout}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Get paid now (1.5% fee)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
