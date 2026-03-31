'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/types/database';
import { formatDate, formatCurrency, getInitials, pluralize } from '@/lib/utils';
import { BOOKING_STATUSES } from '@/lib/constants';

interface BookingInboxItemProps {
  booking: Booking;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function BookingInboxItem({ booking, onConfirm, onCancel }: BookingInboxItemProps) {
  const statusConfig = BOOKING_STATUSES.find((s) => s.value === booking.status);

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={booking.tourist?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(booking.tourist?.full_name || 'G')}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{booking.tourist?.full_name || 'Guest'}</p>
          <Badge className={`text-xs ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}>
            {booking.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {booking.listing?.title || 'Listing'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{formatDate(booking.check_in)}</span>
          <span>·</span>
          <span>{pluralize(booking.guests, 'guest')}</span>
          <span>·</span>
          <span className="font-medium text-foreground">
            {formatCurrency(booking.provider_amount_usd, 'USD')}
          </span>
        </div>
      </div>

      {booking.status === 'pending' && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 h-7"
            onClick={() => onCancel?.(booking.id)}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => onConfirm?.(booking.id)}
          >
            Confirm
          </Button>
        </div>
      )}
    </div>
  );
}
