'use client';

import { useEffect, useRef, useState } from 'react';
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
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  // retryCount is incremented by reconnectWithBackoff to re-trigger the useEffect
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    if (!supabase) return;

    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;

    const channel = supabase.channel(channelName);

    const config: Parameters<typeof channel.on>[1] = {
      event,
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    };

    function reconnectWithBackoff() {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;
      reconnectTimeout.current = setTimeout(() => {
        supabase!.removeChannel(channel);
        setRetryCount((c) => c + 1);
      }, delay);
    }

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
      .on('system' as Parameters<typeof channel.on>[0], { event: 'error' } as Parameters<typeof channel.on>[1], (error: unknown) => {
        console.error('Realtime subscription error:', error);
        reconnectWithBackoff();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
        }
      });

    channelRef.current = channel;

    return () => {
      clearTimeout(reconnectTimeout.current);
      supabase.removeChannel(channel);
    };
  // retryCount is intentionally included so the effect re-runs on reconnect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, filter, enabled, onInsert, onUpdate, onDelete, retryCount]);

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
