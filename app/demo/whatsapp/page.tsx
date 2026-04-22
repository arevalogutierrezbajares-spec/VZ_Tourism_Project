'use client';

import { useState, useEffect } from 'react';
import DemoSidebar from '@/components/whatsapp/DemoSidebar';
import ConversationList from '@/components/whatsapp/ConversationList';
import MessageThread from '@/components/whatsapp/MessageThread';
import BookingPipeline from '@/components/whatsapp/BookingPipeline';
import { MOCK_CONVERSATIONS, MOCK_THREADS, REFERENCE_EPOCH } from '@/lib/whatsapp-demo-data';
import { FlaskConical, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  WaConversation, WaMessage, WaConversationStatus, WaBookingStage,
} from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConvWithMessages = WaConversation & { messages?: WaMessage[] };
type FilterTab = 'all' | WaConversationStatus;

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useClientNow() {
  const [now, setNow] = useState(REFERENCE_EPOCH);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Main demo page ───────────────────────────────────────────────────────────

export default function WhatsAppDemoPage() {
  const [conversations, setConversations] = useState<ConvWithMessages[]>(
    MOCK_CONVERSATIONS.map((c) => ({ ...c, messages: MOCK_THREADS[c.id] ?? [] }))
  );
  const [selected, setSelected] = useState<ConvWithMessages | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  // Mobile view: 'list' | 'thread' | 'pipeline'
  const [mobileView, setMobileView] = useState<'list' | 'thread' | 'pipeline'>('list');
  const [showPipeline, setShowPipeline] = useState(false);
  const clientNow = useClientNow();

  const selectConv = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId) ?? null;
    if (conv) {
      // Clear unread
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c));
      setSelected({ ...conv, unread_count: 0 });
      // On mobile: switch to thread view
      setMobileView('thread');
      setShowPipeline(false);
    }
  };

  const updateStatus = (status: WaConversationStatus) => {
    if (!selected) return;
    setSelected((prev) => prev ? { ...prev, status } : prev);
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, status } : c));
  };

  const updateStage = (stage: WaBookingStage) => {
    if (!selected) return;
    setSelected((prev) => prev ? { ...prev, booking_stage: stage } : prev);
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, booking_stage: stage } : c));
  };

  const sendReply = () => {
    if (!selected || !replyText.trim()) return;
    const newMsg: WaMessage = {
      id: `demo-${Date.now()}`,
      conversation_id: selected.id,
      wa_message_id: null,
      role: 'outbound',
      content: replyText.trim(),
      content_en: null,
      content_es: null,
      detected_lang: null,
      is_ai: false,
      flagged: false,
      flag_reason: null,
      sentiment_score: null,
      created_at: new Date().toISOString(),
    };
    const updated: ConvWithMessages = {
      ...selected,
      status: 'human' as WaConversationStatus,
      messages: [...(selected.messages ?? []), newMsg],
      last_message_preview: replyText.trim().slice(0, 60),
      last_message_at: newMsg.created_at,
    };
    setSelected(updated);
    setConversations((prev) => prev.map((c) => c.id === selected.id ? updated : c));
    setReplyText('');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Demo sidebar */}
      <DemoSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Demo banner */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Demo mode — mock conversations, no live WhatsApp required. All interactions work locally.
          </p>
        </div>

        {/* Messages panel (3-column on desktop, single-panel on mobile) */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: conversation list — full width on mobile when in list view */}
          <div className={
            mobileView === 'list'
              ? 'flex-1 md:flex-none flex flex-col min-w-0 md:w-auto'
              : 'hidden md:flex md:flex-col'
          }>
            <ConversationList
              conversations={conversations}
              selectedId={selected?.id ?? null}
              filter={filter}
              onSelectConversation={selectConv}
              onFilterChange={setFilter}
              clientNow={clientNow}
            />
          </div>

          {/* Center: thread — full width on mobile when in thread view */}
          <div className={
            mobileView === 'thread'
              ? 'flex-1 flex flex-col min-w-0'
              : 'hidden md:flex md:flex-1 md:flex-col md:min-w-0'
          }>
            {/* Mobile back button */}
            {selected && (
              <div className="flex items-center gap-2 px-3 py-2 border-b md:hidden shrink-0 bg-background">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => { setSelected(null); setMobileView('list'); }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
                <span className="flex-1 text-sm font-medium truncate">
                  {selected.guest_name ?? selected.guest_phone}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setShowPipeline((p) => !p)}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Details
                </Button>
              </div>
            )}
            <MessageThread
              selected={selected}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onSendReply={sendReply}
              onUpdateStatus={updateStatus}
            />
          </div>

          {/* Right: booking pipeline — hidden on mobile unless toggled via Details button */}
          {selected && (
            <div className={showPipeline ? 'flex flex-col md:hidden' : 'hidden md:flex md:flex-col'}>
              <BookingPipeline
                selected={selected}
                onUpdateStatus={updateStatus}
                onUpdateStage={updateStage}
              />
            </div>
          )}
          {/* Desktop pipeline (always shown on md+ when selected) */}
          {selected && (
            <div className="hidden md:flex md:flex-col">
              <BookingPipeline
                selected={selected}
                onUpdateStatus={updateStatus}
                onUpdateStage={updateStage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
