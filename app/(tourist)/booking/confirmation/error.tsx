'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BookingConfirmationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Booking confirmation error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="w-10 h-10 text-status-cancelled mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold">Couldn&apos;t load your booking</h2>
        <p className="text-sm text-muted-foreground">
          Your booking may still be confirmed. Please check your email for confirmation details, or try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/trips">View my trips</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
