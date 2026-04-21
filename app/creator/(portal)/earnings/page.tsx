import { redirect } from 'next/navigation';
import { DollarSign, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireCreatorServer } from '@/lib/auth/require-creator-server';

type EarningRow = {
  id: string;
  title: string;
  date: string;
  source: 'referral_link' | 'discount_code';
  amount: number;
  paid: boolean;
};

export default async function EarningsPage() {
  const ctx = await requireCreatorServer();
  if (!ctx) redirect('/auth/login?next=/creator/earnings');

  const supabase = await createClient();
  if (!supabase) {
    return <div className="p-8 text-muted-foreground text-sm">Database unavailable.</div>;
  }

  const creatorId = ctx.creatorId;

  // ── Referral earnings ─────────────────────────────────────────────────────
  const { data: referralRows } = await supabase
    .from('itinerary_referrals')
    .select('id, itinerary_id, clicked_at, commission_amount_usd, paid_at, itineraries(title)')
    .eq('creator_id', creatorId)
    .not('guest_booking_id', 'is', null)
    .order('clicked_at', { ascending: false })
    .limit(50);

  // ── Discount code earnings ────────────────────────────────────────────────
  const { data: codeRows } = await supabase
    .from('discount_code_uses')
    .select(`
      id,
      used_at,
      discount_codes!inner(code, creator_id),
      guest_bookings(total_usd)
    `)
    .eq('discount_codes.creator_id', creatorId)
    .order('used_at', { ascending: false })
    .limit(50);

  // ── Creator profile for commission_rate ───────────────────────────────────
  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('commission_rate')
    .eq('id', creatorId)
    .single();

  const commissionRate = profile?.commission_rate ?? 0.08;

  // ── Merge and sort ────────────────────────────────────────────────────────
  const earnings: EarningRow[] = [];

  for (const r of referralRows ?? []) {
    if (!r.commission_amount_usd) continue;
    earnings.push({
      id: r.id,
      title: (r.itineraries as { title?: string } | null)?.title ?? 'Itinerary',
      date: r.clicked_at,
      source: 'referral_link',
      amount: r.commission_amount_usd,
      paid: !!r.paid_at,
    });
  }

  for (const r of codeRows ?? []) {
    const gb = r.guest_bookings as { total_usd?: number } | null;
    const dc = r.discount_codes as { code?: string } | null;
    if (!gb?.total_usd) continue;
    earnings.push({
      id: r.id,
      title: `Code: ${dc?.code ?? 'discount'}`,
      date: r.used_at,
      source: 'discount_code',
      amount: gb.total_usd * commissionRate,
      paid: false, // discount code earnings marked paid manually after referral sync
    });
  }

  earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTotal = earnings.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0);
  const paidTotal = earnings.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your referral link and discount code commissions.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            Pending payout
          </div>
          <p className="text-3xl font-bold tabular-nums">${pendingTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Paid on the 1st of each month via Zelle or USDT</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Total paid out
          </div>
          <p className="text-3xl font-bold tabular-nums">${paidTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">All-time paid commissions</p>
        </div>
      </div>

      {/* Conversion history */}
      <div>
        <h2 className="text-base font-semibold mb-3">Conversion history</h2>
        {earnings.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-2">
            <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" aria-hidden="true" />
            <p className="text-sm font-medium">No conversions yet</p>
            <p className="text-xs text-muted-foreground">Share your creator link or discount codes to start earning.</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card divide-y">
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    <span className="capitalize">{e.source.replace('_', ' ')}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold tabular-nums">${e.amount.toFixed(2)}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    e.paid
                      ? 'bg-status-confirmed/10 text-status-confirmed border border-status-confirmed/20'
                      : 'bg-status-pending/10 text-status-pending border border-status-pending/20'
                  }`}>
                    {e.paid ? 'paid' : 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout info */}
      <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Payout schedule</p>
        <p>Pending earnings are paid on the 1st of each month via Zelle or USDT.</p>
        <p>To update your payout method, contact the VAV team via WhatsApp.</p>
      </div>
    </div>
  );
}
