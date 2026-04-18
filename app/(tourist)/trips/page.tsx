'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, isPast, isFuture, parseISO, format, formatDistanceToNow } from 'date-fns';
import { Luggage, MapPin, Calendar, Star, Heart, Cloud, BookOpen, Pencil, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface GuestBooking {
  id: string;
  listing_name: string;
  listing_slug: string | null;
  check_in: string;
  check_out: string;
  guest_count: number;
  total_usd: number;
  status: string;
  confirmation_code: string;
  payment_method: string;
}

interface SavedItinerary {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  stops?: unknown[];
}

interface SavedPlace {
  id: string;
  title: string;
  slug?: string;
  location_name?: string;
  cover_image_url?: string | null;
  price_usd?: number;
}

type Tab = 'upcoming' | 'past' | 'itineraries' | 'saved';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  payment_submitted: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Awaiting Confirmation',
  payment_submitted: 'Payment Sent',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function daysUntil(dateStr: string) {
  return differenceInDays(parseISO(dateStr), new Date());
}

function BookingCard({ booking, past }: { booking: GuestBooking; past?: boolean }) {
  const days = past ? null : daysUntil(booking.check_in);
  const withinWeek = days !== null && days <= 7 && days >= 0;

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-36 h-32 sm:h-auto bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center flex-shrink-0">
            <Luggage className="w-10 h-10 text-sky-400" />
          </div>
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-base leading-tight">{booking.listing_name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[booking.status] ?? booking.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Ref: {booking.confirmation_code}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(booking.check_in), 'MMM d')} – {format(parseISO(booking.check_out), 'MMM d, yyyy')}</span>
              <span>{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</span>
              <span className="font-medium text-foreground">${booking.total_usd}</span>
            </div>
            {booking.status === 'pending' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mb-2">
                Awaiting provider confirmation — usually within 24h
              </p>
            )}
            {booking.status === 'payment_submitted' && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 mb-2">
                Payment received — verifying within 1 hour
              </p>
            )}
            {!past && days !== null && days >= 0 && booking.status === 'confirmed' && (
              <p className="text-xs font-semibold text-sky-600 mb-2">
                {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow!' : `In ${days} days!`}
              </p>
            )}
            {withinWeek && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mb-2">
                <Cloud className="w-3 h-3" /> Pre-trip info available
              </p>
            )}
            <div className="flex gap-2">
              <Link
                href={`/bookings/${booking.id}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"
              >
                View Booking
              </Link>
              {past && (
                <button className="text-xs px-3 py-1.5 rounded-lg border text-muted-foreground hover:border-sky-400 hover:text-sky-600 transition-colors">
                  <Star className="w-3 h-3 inline mr-1" />Leave Review
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const configs: Record<Tab, { icon: React.ReactNode; text: string; cta: string; href: string }> = {
    upcoming: {
      icon: <Luggage className="w-12 h-12 text-sky-300" />,
      text: "No upcoming trips yet.",
      cta: "Explore Venezuela →",
      href: "/",
    },
    past: {
      icon: <Star className="w-12 h-12 text-amber-300" />,
      text: "No past trips to show.",
      cta: "Plan your first adventure →",
      href: "/",
    },
    itineraries: {
      icon: <BookOpen className="w-12 h-12 text-sky-300" />,
      text: "No saved itineraries yet.",
      cta: "Start planning →",
      href: "/itinerary/new",
    },
    saved: {
      icon: <Heart className="w-12 h-12 text-red-300" />,
      text: "No saved places yet.",
      cta: "Explore listings →",
      href: "/",
    },
  };

  const { icon, text, cta, href } = configs[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="text-muted-foreground mb-3">{text}</p>
      <Link href={href} className="text-sm font-medium text-sky-500 hover:underline">{cta}</Link>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const { user, profile, loading, isAuthenticated } = useAuth();
  const { items: recentlyViewed } = useRecentlyViewed();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetch('/api/bookings/mine')
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));

    // Load itineraries from localStorage
    try {
      const stored = localStorage.getItem('vz-itineraries');
      if (stored) setItineraries(JSON.parse(stored));
    } catch {}

    // Load saved places from Supabase favorites
    const supabase = createClient();
    if (supabase) {
      (async () => {
        try {
          const { data } = await supabase
            .from('favorites')
            .select('listing_id, listings(id, title, slug, location_name, cover_image_url, price_usd)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            const places = data
              .map((row: { listing_id: string; listings: unknown }) => row.listings as SavedPlace | null)
              .filter((p): p is SavedPlace => p !== null);
            setSavedPlaces(places);
          }
        } catch {}
        setSavedLoading(false);
      })();
    } else {
      setSavedLoading(false);
    }
  }, [isAuthenticated, user]);

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  // "Upcoming" = confirmed future stays + any pending/payment_submitted bookings
  const upcoming = bookings.filter(
    (b) =>
      (b.status === 'confirmed' && isFuture(parseISO(b.check_in))) ||
      b.status === 'pending' ||
      b.status === 'payment_submitted'
  );
  const past = bookings.filter((b) => isPast(parseISO(b.check_out)));

  // Bookings that need the user's attention
  const needsAttention = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'payment_submitted'
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'past', label: 'Past', count: past.length },
    { id: 'itineraries', label: 'Itineraries', count: itineraries.length },
    { id: 'saved', label: 'Saved Places', count: savedPlaces.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">My Trips</h1>
      <p className="text-muted-foreground text-sm mb-4">Welcome back, {firstName}! Here&apos;s your travel history.</p>

      {/* Attention callout */}
      {needsAttention.length > 0 && !bookingsLoading && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {needsAttention.length === 1
                ? '1 booking needs your attention'
                : `${needsAttention.length} bookings need your attention`}
            </p>
            <ul className="mt-1 space-y-0.5">
              {needsAttention.map((b) => (
                <li key={b.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="font-medium">{b.listing_name}</span>
                  <span>·</span>
                  <span>{STATUS_LABELS[b.status] ?? b.status}</span>
                  <Link href={`/bookings/${b.id}`} className="ml-1 underline hover:no-underline">
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              tab === t.id
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-xs bg-sky-100 text-sky-700 rounded-full px-1.5 py-0.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'upcoming' && (
        bookingsLoading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        ) : (
          <EmptyState tab="upcoming" />
        )
      )}

      {tab === 'past' && (
        bookingsLoading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : past.length > 0 ? (
          <div className="space-y-4">
            {past.map((b) => <BookingCard key={b.id} booking={b} past />)}
          </div>
        ) : (
          <EmptyState tab="past" />
        )
      )}

      {tab === 'itineraries' && (
        itineraries.length > 0 ? (
          <div className="space-y-4">
            {itineraries.map((it) => (
              <Card key={it.id} className="rounded-xl shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{it.title}</h3>
                    {it.start_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(it.start_date), 'MMM d')}
                        {it.end_date ? ` – ${format(parseISO(it.end_date), 'MMM d, yyyy')}` : ''}
                      </p>
                    )}
                    {it.stops && (
                      <p className="text-xs text-muted-foreground">{(it.stops as unknown[]).length} stops</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/itinerary/${it.id}`} className="text-xs px-3 py-1.5 rounded-lg border hover:border-sky-400 hover:text-sky-600 transition-colors">View</Link>
                    <Link href={`/itinerary/${it.id}?edit=1`} className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors">
                      <Pencil className="w-3 h-3 inline mr-1" />Edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState tab="itineraries" />
        )
      )}

      {tab === 'saved' && (
        savedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : savedPlaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedPlaces.map((place) => (
              <Link key={place.id} href={place.slug ? `/listing/${place.slug}` : '#'}>
                <Card className="rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="h-32 bg-gradient-to-br from-sky-100 to-amber-100 relative">
                      {place.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={place.cover_image_url} alt={place.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm leading-tight">{place.title}</h3>
                      {place.location_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{place.location_name}
                        </p>
                      )}
                      {place.price_usd && (
                        <p className="text-xs font-medium text-sky-600 mt-1">From ${place.price_usd}/person</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState tab="saved" />
        )
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentlyViewed.map((item) => (
              <Link key={item.id} href={`/listing/${item.slug}`}>
                <Card className="rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="h-28 bg-gradient-to-br from-sky-100 to-amber-100 relative">
                      {item.cover_image_url && (
                        <Image
                          src={item.cover_image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      )}
                      <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full capitalize">
                        {item.category}
                      </span>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-1">{item.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{item.location_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.viewed_at), { addSuffix: true })}
                        </p>
                      </div>
                      {item.price_usd && (
                        <p className="text-xs font-medium text-sky-600 mt-1">${item.price_usd} / person</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
