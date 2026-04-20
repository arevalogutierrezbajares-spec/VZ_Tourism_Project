'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bot, User, AlertTriangle, Send,
  Sparkles, Phone,
  CheckCheck, Globe,
} from 'lucide-react';
import type {
  WaConversation, WaMessage, WaConversationStatus,
} from '@/types/database';
import { WA_STATUS_CONFIG as STATUS_CONFIG } from '@/lib/status-config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, phone: string): string {
  if (name) return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return phone.slice(-2);
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isOut = msg.role === 'outbound';
  const [showTranslation, setShowTranslation] = useState(false);
  const hasTranslation = !!(msg.content_en && msg.content_en !== msg.content);

  return (
    <div className={cn('flex gap-2 mb-2', isOut ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="w-6 h-6 shrink-0 mt-auto">
        <AvatarFallback className="text-2xs bg-muted">
          {isOut ? (msg.is_ai ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />) : <Phone className="w-3 h-3" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('max-w-[68%] flex flex-col gap-0.5', isOut ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm leading-relaxed',
            isOut
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            msg.flagged && 'ring-1 ring-destructive'
          )}
        >
          {msg.content}
        </div>

        {hasTranslation && (
          <div className={cn('px-1', isOut ? 'text-right' : 'text-left')}>
            <button
              onClick={() => setShowTranslation((s) => !s)}
              className="text-2xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              {showTranslation ? 'Hide translation' : `Show in English (${msg.detected_lang?.toUpperCase() ?? '?'})`}
            </button>
            {showTranslation && (
              <p className="text-[11px] text-muted-foreground italic mt-1 bg-muted/40 px-2 py-1 rounded-lg">
                {msg.content_en}
              </p>
            )}
          </div>
        )}

        <div className={cn('flex items-center gap-1 px-1', isOut ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-2xs text-muted-foreground">{formatTime(msg.created_at)}</span>
          {isOut && msg.is_ai && <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />}
          {isOut && !msg.is_ai && <CheckCheck className="w-3 h-3 text-muted-foreground" />}
          {msg.flagged && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
          {hasTranslation && !showTranslation && (
            <Globe className="w-2.5 h-2.5 text-blue-400" aria-label={`Message in ${msg.detected_lang}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <Separator className="flex-1" />
      <span className="text-2xs text-muted-foreground uppercase tracking-wider font-medium px-2">{label}</span>
      <Separator className="flex-1" />
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
      <p className="text-xs text-muted-foreground mt-1">AI responses appear instantly — take over any time.</p>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MessageThreadProps {
  selected: (WaConversation & { messages?: WaMessage[] }) | null;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  onUpdateStatus: (status: WaConversationStatus) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MessageThread({
  selected,
  replyText,
  onReplyTextChange,
  onSendReply,
  onUpdateStatus,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages?.length]);

  const groupedMessages = useMemo(() => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendReply(); }
  };

  if (!selected) {
    return (
      <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
        <NoThreadSelected />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
      {/* Thread header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(selected.guest_name, selected.guest_phone)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{selected.guest_name ?? selected.guest_phone}</p>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded border', STATUS_CONFIG[selected.status].badge)}>
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
        {(selected.messages ?? []).length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16">No messages yet</div>
        ) : (
          groupedMessages.map(({ day, messages: dayMsgs }) => (
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
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground min-h-[40px] max-h-28"
              rows={1}
              placeholder="Message guest…"
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              onClick={onSendReply}
              disabled={!replyText.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-2xs text-muted-foreground mt-1.5">↵ Send · ⇧↵ New line</p>
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
              onClick={() => onUpdateStatus('human')}
              className="text-xs text-primary hover:underline mt-1 font-medium"
            >
              Take over →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
