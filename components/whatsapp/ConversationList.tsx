'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  RefreshCw, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatsStrip from './StatsStrip';
import type {
  WaConversation, WaConversationStatus,
} from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WaConversationStatus, { label: string; badge: string; dot: string }> = {
  ai:        { label: 'AI',        badge: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500' },
  human:     { label: 'Human',     badge: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500'  },
  escalated: { label: 'Escalated', badge: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500'   },
  closed:    { label: 'Closed',    badge: 'bg-gray-100 text-gray-500 border-gray-200',     dot: 'bg-gray-400'  },
};

export type FilterTab = 'all' | WaConversationStatus;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, phone: string): string {
  if (name) return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return phone.slice(-2);
}

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return '';
  const diff = now - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ConversationRow({
  conv, selected, onClick, now,
}: { conv: WaConversation; selected: boolean; onClick: () => void; now: number }) {
  const cfg = STATUS_CONFIG[conv.status];
  const initials = getInitials(conv.guest_name, conv.guest_phone);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors',
        selected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : 'hover:bg-muted/40 border-l-2 border-l-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="text-xs font-semibold bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background', cfg.dot)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className={cn('text-sm font-medium truncate', selected ? 'text-primary' : 'text-foreground')}>
              {conv.guest_name ?? conv.guest_phone}
            </p>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(conv.last_message_at, now)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message_preview ?? 'No messages yet'}
            </p>
            {conv.unread_count > 0 && (
              <span className="shrink-0 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function NoConversationsState({ filter }: { filter: FilterTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        {filter === 'all' ? 'No conversations yet' : `No ${filter} conversations`}
      </p>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ConversationListProps {
  conversations: WaConversation[];
  selectedId: string | null;
  filter: FilterTab;
  onSelectConversation: (convId: string) => void;
  onFilterChange: (filter: FilterTab) => void;
  clientNow: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConversationList({
  conversations,
  selectedId,
  filter,
  onSelectConversation,
  onFilterChange,
  clientNow,
}: ConversationListProps) {
  const filteredConvs = conversations
    .filter((c) => filter === 'all' || c.status === filter)
    .sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="w-[280px] flex-shrink-0 border-r flex flex-col bg-background">
      <div className="px-4 py-3.5 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Messages</h1>
            <p className="text-xs text-muted-foreground">WhatsApp · AI concierge</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Refresh (demo)"
            onClick={() => toast('Conversation list updated')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <StatsStrip conversations={conversations} />

      <div className="flex gap-1 px-3 py-2 border-b">
        {(['all', 'ai', 'human', 'escalated', 'closed'] as FilterTab[]).map((s) => (
          <button
            key={s}
            onClick={() => onFilterChange(s)}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors capitalize',
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConvs.length === 0 ? (
          <NoConversationsState filter={filter} />
        ) : (
          filteredConvs.map((conv) => (
            <ConversationRow
              key={conv.id}
              conv={conv}
              selected={selectedId === conv.id}
              onClick={() => onSelectConversation(conv.id)}
              now={clientNow}
            />
          ))
        )}
      </div>
    </div>
  );
}
