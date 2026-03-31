'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface Props {
  bookingId: string;
  status: string;
}

export function BookingActions({ bookingId, status }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      toast.success(`Booking ${newStatus}`);
      window.location.reload();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50" disabled={isLoading}>
        <MoreHorizontal className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === 'pending' && (
          <>
            <DropdownMenuItem onClick={() => updateStatus('confirmed')}>Confirm</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('cancelled')} className="text-destructive">
              Decline
            </DropdownMenuItem>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <DropdownMenuItem onClick={() => updateStatus('completed')}>Mark Completed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('cancelled')} className="text-destructive">
              Cancel
            </DropdownMenuItem>
          </>
        )}
        {(status === 'completed' || status === 'cancelled') && (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
