import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart2, DollarSign, MapPin, Users, Copy, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireCreatorServer } from '@/lib/auth/require-creator-server';

// Copy-link button — needs client interactivity, keep isolated
import { CopyLinkButton } from '@/components/creator/CopyLinkButton';

export default async function CreatorDashboardPage() {
  const ctx = await requireCreatorServer();
  if (!ctx) redirect('/auth/login?next=/creator/dashboard');

  const supabase = await createClient();
  if (!supabase) {
    return <div className="p-8 text-muted-foreground text-sm">Database unavailable.</div>;
  }

  const creatorId = ctx.creatorId;
  const userId = ctx.userId;

  // ── Stats queries (parallel) ────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: linkClicks },
    { data: earningsRow },
    { count: liveItineraries },
    { count: bookingsConverted },
    { data: profile },
    { data: recentItineraries },
  ] = await Promise.all([
    supabase
      .from('itinerary_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('clicked_at', thirtyDaysAgo),

    supabase
      .from('itinerary_referrals')
      .select('commission_amount_usd')
      .eq('creator_id', creatorId)
      .not('converted_at', 'is', null)
      .is('paid_at', null),

    supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_public', true),

    supabase
      .from('itinerary_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .not('guest_booking_id', 'is', null),

    supabase
      .from('creator_profiles')
      .select('username, display_name')
      .eq('id', creatorId)
      .single(),

    supabase
      .from('itineraries')
      .select('id, title, total_days, regions')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const pendingEarnings = (earningsRow ?? []).reduce(
    (sum, r) => sum + (r.commission_amount_usd ?? 0),
    0
  );

  const username = profile?.username ?? '';
  const displayName = profile?.display_name ?? 'Creator';
  const profileUrl = `https://vzvz.app/creator/${username}`;

  const stats = [
    {
      label: 'Link clicks (30d)',
      value: (linkClicks ?? 0).toLocaleString(),
      icon: Users,
      sub: 'Followers who visited your link',
    },
    {
      label: 'Earnings pending',
      value: `$${pendingEarnings.toFixed(2)}`,
      icon: DollarSign,
      sub: 'Unpaid commissions',
    },
    {
      label: 'Itineraries live',
      value: (liveItineraries ?? 0).toLocaleString(),
      icon: MapPin,
      sub: 'Published itineraries',
    },
    {
      label: 'Bookings converted',
      value: (bookingsConverted ?? 0).toLocaleString(),
      icon: BarChart2,
      sub: 'Followers who booked',
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {displayName}</p>
        </div>
        <Link
          href="/creator/itineraries/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Itinerary
        </Link>
      </div>

      {/* Your link */}
      {username && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Your creator link</p>
            <p className="text-sm font-mono font-medium truncate">{profileUrl}</p>
          </div>
          <CopyLinkButton url={profileUrl} />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent itineraries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent itineraries</h2>
          <Link href="/creator/itineraries/new" className="text-xs text-primary hover:underline">
            + New
          </Link>
        </div>
        {!recentItineraries?.length ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No published itineraries yet.{' '}
            <Link href="/creator/itineraries/new" className="text-primary hover:underline">
              Create your first one →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {recentItineraries.map((it) => (
              <div key={it.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {it.total_days} days
                    {it.regions?.length > 0 && ` · ${it.regions[0]}`}
                  </p>
                </div>
                <Link
                  href={`/itinerary/${it.id}`}
                  className="text-xs text-primary hover:underline flex-shrink-0"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
