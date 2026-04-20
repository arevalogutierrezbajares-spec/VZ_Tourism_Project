'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal } from 'lucide-react';
import type { BookingStatus } from '@/lib/bookings-store';

interface Props {
  bookingId: string;
  status: BookingStatus;
}

export function ProviderBookingActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  async function updateStatus(newStatus: BookingStatus) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      const label =
        newStatus === 'confirmed'
          ? 'Booking confirmed!'
          : newStatus === 'completed'
          ? 'Marked as completed'
          : 'Booking cancelled';
      toast.success(label);
      router.refresh();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  }

  const isPending = status === 'pending' || status === 'payment_submitted';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center h-7 w-7 p-0 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          disabled={isLoading}
          aria-label="Booking actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isPending && (
            <>
              <DropdownMenuItem onClick={() => updateStatus('confirmed')}>
                Confirm booking
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCancelDialogOpen(true)}
                className="text-destructive"
              >
                Decline / Cancel
              </DropdownMenuItem>
            </>
          )}
          {status === 'confirmed' && (
            <>
              <DropdownMenuItem onClick={() => updateStatus('completed')}>
                Mark as completed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCancelDialogOpen(true)}
                className="text-destructive"
              >
                Cancel booking
              </DropdownMenuItem>
            </>
          )}
          {(status === 'completed' || status === 'cancelled') && (
            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPending ? 'Decline this booking?' : 'Cancel this booking?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPending
                ? 'The guest will be notified that their booking request was declined.'
                : 'The guest will be notified that their confirmed booking has been cancelled. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatus('cancelled')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Decline' : 'Cancel booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
