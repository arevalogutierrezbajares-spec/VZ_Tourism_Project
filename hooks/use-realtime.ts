'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions<T> {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (record: T) => void;
  enabled?: boolean;
}

export function useRealtime<T>({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;

    const channel = supabase.channel(channelName);

    const config: Parameters<typeof channel.on>[1] = {
      event,
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    };

    channel
      .on('postgres_changes' as Parameters<typeof channel.on>[0], config, (payload) => {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new as T);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new as T);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload.old as T);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, enabled, onInsert, onUpdate, onDelete]);

  return channelRef.current;
}

export function useRealtimeNotifications(
  userId: string | undefined,
  onNotification: (notification: unknown) => void
) {
  return useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: onNotification,
    enabled: !!userId,
  });
}

export function useRealtimeBookings(
  providerId: string | undefined,
  onNewBooking: (booking: unknown) => void
) {
  return useRealtime({
    table: 'bookings',
    event: 'INSERT',
    filter: providerId ? `provider_id=eq.${providerId}` : undefined,
    onInsert: onNewBooking,
    enabled: !!providerId,
  });
}
