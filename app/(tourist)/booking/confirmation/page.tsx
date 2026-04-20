import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBooking } from '@/lib/bookings-store';
import { createClient } from '@/lib/supabase/server';
import { ConfirmationClient } from './ConfirmationClient';

export const metadata: Metadata = { title: 'Booking Confirmed' };

// Force dynamic since booking data lives on disk
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  // Auth gate — require an authenticated session
  const supabase = await createClient();
  if (!supabase) redirect('/login?redirectTo=/booking/confirmation');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/booking/confirmation');

  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">No booking ID provided.</p>
          <Link href="/" className="text-primary underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const booking = getBooking(id);
  if (!booking) notFound();

  // Ownership check — booking must belong to the authenticated user
  if (booking.guest_email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground font-medium">Access denied.</p>
          <p className="text-sm text-muted-foreground">This booking does not belong to your account.</p>
          <Link href="/" className="text-primary underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <ConfirmationClient booking={booking} />;
}
