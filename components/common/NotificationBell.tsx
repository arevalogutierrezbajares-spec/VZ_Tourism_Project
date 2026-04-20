'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread=true&limit=5');
      if (!res.ok) return;
      const json = await res.json();
      const data: Notification[] = json.data ?? [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      // silently fail — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 text-[10px] font-bold leading-none rounded-full bg-destructive text-destructive-foreground"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <ul className="divide-y max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  !n.is_read && 'bg-muted/40'
                )}
              >
                {!n.is_read && (
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full bg-destructive flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className={cn('flex-1 min-w-0', n.is_read && 'pl-5')}>
                  <p className="text-sm font-medium leading-snug truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="flex-shrink-0 text-[10px] text-primary hover:underline mt-1"
                    aria-label={`Mark "${n.title}" as read`}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
