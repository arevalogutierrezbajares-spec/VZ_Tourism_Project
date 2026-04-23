'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProviderStore } from '@/stores/provider-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bot, User, AlertTriangle, Send, RefreshCw,
  MessageCircle, Settings, Sparkles, Phone,
  CheckCheck, Circle, Globe, ChevronLeft,
  Search, X, Zap, CalendarPlus, BarChart3, ExternalLink,
  MessageSquarePlus,
} from 'lucide-react';
import type {
  WaConversation, WaMessage, WaConversationStatus, WaBookingStage,
  QuickReplyTemplate,
} from '@/types/database';
import toast from 'react-hot-toast';
import StatsStrip from '@/components/whatsapp/StatsStrip';
import { WA_STATUS_CONFIG as STATUS_CONFIG } from '@/lib/status-config';

const STAGE_CONFIG: Record<WaBookingStage, { label: string; color: string }> = {
  lead:       { label: 'Lead',       color: 'text-muted-foreground' },
  quoted:     { label: 'Quoted',     color: 'text-accent'           },
  confirmed:  { label: 'Confirmed',  color: 'text-status-confirmed' },
  checked_in: { label: 'Checked In', color: 'text-primary'          },
  closed:     { label: 'Closed',     color: 'text-muted-foreground' },
};

type ConvWithMessages = WaConversation & { messages?: WaMessage[] };
type FilterTab = 'all' | WaConversationStatus;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
  return phone.slice(-2);
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="p-4 border-b space-y-2">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-3 w-6" />
      </div>
    </div>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConversationRow({
  conv, selected, onClick,
}: { conv: WaConversation; selected: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[conv.status];
  const initials = getInitials(conv.guest_name, conv.guest_phone);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors group',
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
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(conv.last_message_at)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message_preview ?? 'No messages yet'}
            </p>
            {conv.unread_count > 0 && (
              <span className="shrink-0 flex items-center justify-center w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isOut = msg.role === 'outbound';
  const [showLang, setShowLang] = useState<'none' | 'es' | 'en'>('none');

  const hasEs = !!(msg.content_es && msg.content_es !== msg.content);
  const hasEn = !!(msg.content_en && msg.content_en !== msg.content);
  const hasAnyTranslation = hasEs || hasEn;
  const langLabel = msg.detected_lang?.toUpperCase() ?? '?';

  return (
    <div className={cn('flex gap-2 mb-2', isOut ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="w-6 h-6 shrink-0 mt-auto">
        <AvatarFallback className="text-[10px] bg-muted">
          {isOut ? (msg.is_ai ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />) : <Phone className="w-3 h-3" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('max-w-[68%]', isOut ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm leading-relaxed',
            isOut
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            msg.flagged && 'ring-1 ring-destructive'
          )}
        >
          {/* Media attachment */}
          {msg.media_url && (
            <div className="mb-1">
              {msg.media_type?.startsWith('image/') || msg.content === '[Sticker]' ? (
                <img
                  src={msg.media_url}
                  alt="Shared media"
                  className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                  onClick={() => window.open(msg.media_url!, '_blank')}
                  loading="lazy"
                />
              ) : msg.media_type?.startsWith('audio/') ? (
                <audio controls className="max-w-full" preload="none">
                  <source src={msg.media_url} type={msg.media_type} />
                </audio>
              ) : msg.media_type?.startsWith('video/') ? (
                <video controls className="rounded-lg max-w-full max-h-64" preload="none">
                  <source src={msg.media_url} type={msg.media_type} />
                </video>
              ) : (
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-primary"
                >
                  Download {msg.content}
                </a>
              )}
            </div>
          )}
          {/* Hide text label when media is loaded (labels like [Photo], [Voice note], etc.) */}
          {(!msg.media_url || !/^\[.+\]$/.test(msg.content)) && msg.content}
        </div>

        {/* Translation toggles — Spanish primary (posada admin), English secondary */}
        {hasAnyTranslation && (
          <div className={cn('flex items-center gap-2 px-1', isOut ? 'justify-end' : 'justify-start')}>
            {hasEs && (
              <button
                onClick={() => setShowLang((s) => s === 'es' ? 'none' : 'es')}
                className={cn(
                  'text-[10px] underline-offset-2 hover:underline transition-colors',
                  showLang === 'es' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {showLang === 'es' ? 'Ocultar ES' : `Ver en Español (${langLabel})`}
              </button>
            )}
            {hasEs && hasEn && <span className="text-[10px] text-muted-foreground/40">·</span>}
            {hasEn && (
              <button
                onClick={() => setShowLang((s) => s === 'en' ? 'none' : 'en')}
                className={cn(
                  'text-[10px] underline-offset-2 hover:underline transition-colors',
                  showLang === 'en' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {showLang === 'en' ? 'Hide EN' : `Show in English (${langLabel})`}
              </button>
            )}
          </div>
        )}
        {showLang === 'es' && hasEs && (
          <p className="text-[11px] text-muted-foreground italic mx-1 bg-muted/40 px-2 py-1 rounded-lg">
            {msg.content_es}
          </p>
        )}
        {showLang === 'en' && hasEn && (
          <p className="text-[11px] text-muted-foreground italic mx-1 bg-muted/40 px-2 py-1 rounded-lg">
            {msg.content_en}
          </p>
        )}

        <div className={cn('flex items-center gap-1 px-1', isOut ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
          {isOut && msg.is_ai && <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />}
          {isOut && !msg.is_ai && <CheckCheck className="w-3 h-3 text-muted-foreground" />}
          {msg.flagged && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
          {hasAnyTranslation && showLang === 'none' && (
            <Globe className="w-2.5 h-2.5 text-primary/60" aria-label={`Message in ${msg.detected_lang}`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Divider ─────────────────────────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <Separator className="flex-1" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function NotConfiguredState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-sm">WhatsApp not connected</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          Connect your WhatsApp Business number to start receiving and managing guest messages.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/dashboard/whatsapp/setup">
            <Settings className="w-3.5 h-3.5 mr-1.5" />
            Set up WhatsApp
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function NoConversationsState({ filter }: { filter: FilterTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        {filter === 'all' ? 'No conversations yet' : `No ${filter} conversations`}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {filter === 'all'
          ? 'Messages from guests will appear here in real time.'
          : 'Conversations in this state will appear here.'}
      </p>
    </div>
  );
}

function NoThreadSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="font-medium text-sm text-muted-foreground">Select a conversation</p>
      <p className="text-xs text-muted-foreground mt-1">
        AI responses appear instantly — take over any time.
      </p>
    </div>
  );
}

// ─── Mode Button ──────────────────────────────────────────────────────────────

function ModeButton({
  active, icon, label, description, onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {icon}
        </div>
        <div>
          <p className={cn('text-xs font-medium', active ? 'text-primary' : 'text-foreground')}>{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        {active && <Circle className="w-1.5 h-1.5 fill-primary text-primary ml-auto" />}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const supabase = createClient();
  const { provider, setWaUnreadCount } = useProviderStore();

  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [selected, setSelected]           = useState<ConvWithMessages | null>(null);
  const [replyText, setReplyText]         = useState('');
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [filter, setFilter]               = useState<FilterTab>('all');
  const [configured, setConfigured]       = useState(true);
  const [mobileView, setMobileView]       = useState<'list' | 'chat'>('list');
  const [searchQuery, setSearchQuery]     = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates]         = useState<QuickReplyTemplate[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (filter !== 'all') params.set('status', filter);

    const res = await fetch(`/api/whatsapp/conversations?${params}`);
    if (res.status === 404) { setConfigured(false); setLoading(false); return; }
    if (!res.ok) { setLoading(false); return; }

    const json = await res.json() as { data: WaConversation[] };
    const convs = json.data ?? [];
    setConversations(convs);
    setConfigured(true);

    // Update global WA unread badge
    const totalUnread = convs.reduce((n, c) => n + (c.unread_count ?? 0), 0);
    setWaUnreadCount(totalUnread);
    setLoading(false);
  }, [filter, setWaUnreadCount]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Check config on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/whatsapp/config').then(async (res) => {
      if (res.ok) {
        const { data } = await res.json() as { data: unknown };
        setConfigured(!!data);
      }
    });
  }, []);

  // ── Load quick reply templates ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/whatsapp/templates').then(async (res) => {
      if (res.ok) {
        const { data } = await res.json() as { data: QuickReplyTemplate[] };
        setTemplates(data ?? []);
      }
    }).catch(() => {});
  }, []);

  // ── Load thread ─────────────────────────────────────────────────────────────
  const loadThread = useCallback(async (convId: string) => {
    setThreadLoading(true);
    setMobileView('chat');
    const res = await fetch(`/api/whatsapp/conversations/${convId}`);
    if (res.ok) {
      const json = await res.json() as { data: ConvWithMessages };
      setSelected(json.data);
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c));
      // Update global badge
      setWaUnreadCount(
        conversations.reduce((n, c) => n + (c.id === convId ? 0 : (c.unread_count ?? 0)), 0)
      );
    }
    setThreadLoading(false);
  }, [conversations, setWaUnreadCount]);

  // ── Supabase Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !provider?.id) return;
    const channel = supabase
      .channel('wa_messages_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wa_conversations',
        filter: `provider_id=eq.${provider.id}`,
      }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wa_messages' }, (payload) => {
        const msg = payload.new as WaMessage;
        // Only inject messages belonging to our conversations
        const isOurs = conversations.some((c) => c.id === msg.conversation_id);
        if (!isOurs) return;
        setSelected((prev) => {
          if (!prev || prev.id !== msg.conversation_id) return prev;
          const existing = prev.messages ?? [];
          if (existing.some((m) => m.id === msg.id)) return prev;
          return { ...prev, messages: [...existing, msg] };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, provider?.id, loadConversations, conversations]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages?.length]);

  // ── Group messages by day ───────────────────────────────────────────────────
  const groupedMessages = useCallback(() => {
    const msgs = selected?.messages ?? [];
    const groups: { day: string; messages: WaMessage[] }[] = [];
    let currentDay = '';
    for (const msg of msgs) {
      const day = formatDay(msg.created_at);
      if (day !== currentDay) { currentDay = day; groups.push({ day, messages: [] }); }
      groups[groups.length - 1]!.messages.push(msg);
    }
    return groups;
  }, [selected?.messages]);

  // ── Update status ───────────────────────────────────────────────────────────
  const updateStatus = async (status: WaConversationStatus) => {
    if (!selected) return;
    const res = await fetch(`/api/whatsapp/conversations/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { data } = await res.json() as { data: WaConversation };
      setSelected((prev) => prev ? { ...prev, status: data.status } : prev);
      setConversations((prev) => prev.map((c) => c.id === data.id ? { ...c, status: data.status } : c));
      toast.success(`Mode: ${STATUS_CONFIG[status].label}`);
    }
  };

  // ── Update booking stage ────────────────────────────────────────────────────
  const updateStage = async (stage: WaBookingStage) => {
    if (!selected) return;
    const res = await fetch(`/api/whatsapp/conversations/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_stage: stage }),
    });
    if (res.ok) {
      const { data } = await res.json() as { data: WaConversation };
      setSelected((prev) => prev ? { ...prev, booking_stage: data.booking_stage } : prev);
      toast.success(`Stage: ${STAGE_CONFIG[stage].label}`);
    }
  };

  // ── Send manual message ─────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selected.id, body: replyText.trim() }),
      });
      if (res.ok) {
        const { data } = await res.json() as { data: WaMessage };
        setSelected((prev) =>
          prev ? { ...prev, status: 'human', messages: [...(prev.messages ?? []), data] } : prev
        );
        setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, status: 'human' } : c));
        setReplyText('');
      } else {
        toast.error('Failed to send message');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  const filteredConvs = conversations.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (c.guest_name?.toLowerCase().includes(q)) ||
        c.guest_phone.includes(q) ||
        (c.last_message_preview?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────

  if (!loading && !configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm">AI-powered WhatsApp guest messaging</p>
        </div>
        <NotConfiguredState />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-88px)] -m-6 overflow-hidden bg-background">

      {/* ── Left: Conversation list ──────────────────────────────────────────── */}
      <div className={cn(
        'flex-shrink-0 border-r flex flex-col',
        'w-full md:w-[260px] lg:w-[280px]',
        mobileView === 'chat' && 'hidden md:flex'
      )}>
        {/* Header */}
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
              onClick={loadConversations}
              aria-label="Refresh conversations"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar huésped..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 rounded-md border bg-muted/30 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {!loading && conversations.length > 0 && (
          <StatsStrip conversations={conversations} />
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b">
          {(['all', 'ai', 'human', 'escalated', 'closed'] as FilterTab[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </>
          ) : filteredConvs.length === 0 ? (
            <NoConversationsState filter={filter} />
          ) : (
            filteredConvs.map((conv) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                selected={selected?.id === conv.id}
                onClick={() => loadThread(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Center: Thread ───────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 border-r',
        mobileView === 'list' && 'hidden md:flex'
      )}>
        {selected ? (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-background shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 md:hidden shrink-0"
                  onClick={() => setMobileView('list')}
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs font-semibold">
                    {getInitials(selected.guest_name, selected.guest_phone)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{selected.guest_name ?? selected.guest_phone}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', STATUS_CONFIG[selected.status].badge)}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selected.guest_name ? selected.guest_phone : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              {threadLoading ? (
                <div className="space-y-3 pt-4">
                  {[60, 44, 80, 36, 56].map((w, i) => (
                    <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'flex-row-reverse' : 'flex-row')}>
                      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                      <Skeleton className={`h-9 rounded-2xl`} style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              ) : (selected.messages ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-16">No messages yet</div>
              ) : (
                groupedMessages().map(({ day, messages: dayMsgs }) => (
                  <div key={day}>
                    <DayDivider label={day} />
                    {dayMsgs.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            {selected.status === 'human' ? (
              <div className="px-4 py-3 border-t bg-background shrink-0">
                {/* Quick reply template picker */}
                {showTemplates && templates.length > 0 && (
                  <div className="mb-2 p-2 rounded-lg border bg-muted/20 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                      Respuestas rápidas
                    </p>
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setReplyText(t.body); setShowTemplates(false); }}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <p className="text-xs font-medium">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.body.slice(0, 80)}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => setShowTemplates((s) => !s)}
                      title="Respuestas rápidas"
                    >
                      <Zap className={cn('w-4 h-4', showTemplates ? 'text-primary' : 'text-muted-foreground')} />
                    </Button>
                  </div>
                  <textarea
                    className="flex-1 resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground min-h-[40px] max-h-28"
                    rows={1}
                    placeholder="Message guest…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-label="Reply to guest"
                  />
                  <Button
                    size="sm"
                    className="h-10 w-10 p-0 shrink-0"
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">↵ Send · ⇧↵ New line · ⚡ Respuestas rápidas</p>
              </div>
            ) : (
              <div className="px-4 py-3 border-t bg-muted/20 text-center shrink-0">
                <p className="text-xs text-muted-foreground">
                  {selected.status === 'ai'
                    ? '✦ AI is handling this conversation'
                    : selected.status === 'escalated'
                    ? '⚠ Flagged — set to Human to reply'
                    : 'Conversation closed'}
                </p>
                {selected.status !== 'closed' && (
                  <button
                    onClick={() => updateStatus('human')}
                    className="text-xs text-primary hover:underline mt-1 font-medium"
                  >
                    Take over →
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <NoThreadSelected />
        )}
      </div>

      {/* ── Right: Controls ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="hidden lg:flex w-52 flex-shrink-0 flex-col overflow-y-auto">
          {/* Mode control */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Handling Mode
            </p>
            <div className="space-y-1.5">
              <ModeButton
                active={selected.status === 'ai'}
                icon={<Bot className="w-3.5 h-3.5" />}
                label="AI"
                description="Auto-replies"
                onClick={() => updateStatus('ai')}
              />
              <ModeButton
                active={selected.status === 'human'}
                icon={<User className="w-3.5 h-3.5" />}
                label="Take Over"
                description="You're typing"
                onClick={() => updateStatus('human')}
              />
              <ModeButton
                active={selected.status === 'closed'}
                icon={<CheckCheck className="w-3.5 h-3.5" />}
                label="Close"
                description="Done"
                onClick={() => updateStatus('closed')}
              />
            </div>
          </div>

          {/* Booking stage */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Booking Stage
            </p>
            <div className="space-y-0.5">
              {(Object.keys(STAGE_CONFIG) as WaBookingStage[]).map((stage) => {
                const active = selected.booking_stage === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => updateStage(stage)}
                    className={cn(
                      'w-full text-left text-xs px-2.5 py-2 rounded-md transition-colors flex items-center gap-2',
                      active ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', active ? 'bg-primary-foreground' : 'bg-border')} />
                    {STAGE_CONFIG[stage].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest info */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Guest
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">{selected.guest_name ?? '—'}</p>
              <p className="text-xs text-muted-foreground font-mono">{selected.guest_phone}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Since {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-4 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Acciones
            </p>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 justify-start"
                onClick={() => updateStatus('ai')}
                disabled={selected.status === 'ai'}
              >
                <Bot className="w-3 h-3 mr-1.5" />
                Resume AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 justify-start"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selected.guest_name) params.set('guest_name', selected.guest_name);
                  if (selected.guest_phone) params.set('guest_phone', selected.guest_phone);
                  params.set('conversation_id', selected.id);
                  window.open(`/dashboard/bookings/new?${params}`, '_blank');
                }}
              >
                <CalendarPlus className="w-3 h-3 mr-1.5" />
                Crear Reserva
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 justify-start text-destructive hover:text-destructive"
                onClick={() => updateStage('closed')}
              >
                <CheckCheck className="w-3 h-3 mr-1.5" />
                Mark Closed
              </Button>
            </div>
          </div>

          {/* Links */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Herramientas
            </p>
            <div className="space-y-1.5">
              <Button variant="ghost" size="sm" className="w-full text-xs h-7 justify-start" asChild>
                <Link href="/dashboard/whatsapp/analytics">
                  <BarChart3 className="w-3 h-3 mr-1.5" />
                  Analíticas
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs h-7 justify-start" asChild>
                <Link href="/dashboard/crm">
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  CRM
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs h-7 justify-start" asChild>
                <Link href="/dashboard/whatsapp/setup">
                  <Settings className="w-3 h-3 mr-1.5" />
                  Configuración
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
