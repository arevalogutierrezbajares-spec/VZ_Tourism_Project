'use client';

import { useState, useEffect } from 'react';
import DemoSidebar from '@/components/whatsapp/DemoSidebar';
import ConversationList from '@/components/whatsapp/ConversationList';
import MessageThread from '@/components/whatsapp/MessageThread';
import BookingPipeline from '@/components/whatsapp/BookingPipeline';
import { MOCK_CONVERSATIONS, MOCK_THREADS, REFERENCE_EPOCH } from '@/lib/whatsapp-demo-data';
import { FlaskConical } from 'lucide-react';
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
  const clientNow = useClientNow();

  const selectConv = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId) ?? null;
    if (conv) {
      // Clear unread
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c));
      setSelected({ ...conv, unread_count: 0 });
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

        {/* Messages panel (3-column) */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: conversation list */}
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            filter={filter}
            onSelectConversation={selectConv}
            onFilterChange={setFilter}
            clientNow={clientNow}
          />

          {/* Center: thread */}
          <MessageThread
            selected={selected}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSendReply={sendReply}
            onUpdateStatus={updateStatus}
          />

          {/* Right: controls */}
          {selected && (
            <BookingPipeline
              selected={selected}
              onUpdateStatus={updateStatus}
              onUpdateStage={updateStage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
