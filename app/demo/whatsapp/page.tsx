'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import DemoSidebar from '@/components/whatsapp/DemoSidebar';
import { cn } from '@/lib/utils';
import {
  Bot, User, AlertTriangle, Send, RefreshCw,
  MessageCircle, Sparkles, Phone,
  CheckCheck, Circle, Globe, FlaskConical,
} from 'lucide-react';
import type {
  WaConversation, WaMessage, WaConversationStatus, WaBookingStage,
} from '@/types/database';

// ─── Mock data ────────────────────────────────────────────────────────────────
// Use a fixed reference epoch so SSR and CSR produce identical timestamps
// (avoids hydration mismatch from Date.now() differing between server and client).

const REFERENCE_EPOCH = new Date('2026-04-20T14:00:00Z').getTime();
const minsAgo = (n: number) => new Date(REFERENCE_EPOCH - n * 60000).toISOString();
const daysAgo = (n: number) => new Date(REFERENCE_EPOCH - n * 86400000).toISOString();

const MOCK_CONVERSATIONS: WaConversation[] = [
  {
    id: 'conv-1',
    provider_id: 'demo-provider',
    guest_phone: '+58412555-0101',
    guest_name: 'María Rodríguez',
    status: 'escalated',
    unread_count: 3,
    last_message_at: minsAgo(4),
    last_message_preview: 'No entiendo por qué el precio cambió',
    booking_stage: 'quoted',
    notes: null,
    guest_language: 'es',
    created_at: daysAgo(2),
    updated_at: minsAgo(4),
  },
  {
    id: 'conv-2',
    provider_id: 'demo-provider',
    guest_phone: '+17865550022',
    guest_name: 'James Whitfield',
    status: 'human',
    unread_count: 0,
    last_message_at: minsAgo(22),
    last_message_preview: "Perfect, we'll arrive around 3pm then",
    booking_stage: 'confirmed',
    notes: null,
    guest_language: 'en',
    created_at: daysAgo(4),
    updated_at: minsAgo(22),
  },
  {
    id: 'conv-3',
    provider_id: 'demo-provider',
    guest_phone: '+34912555-0333',
    guest_name: 'Carlos Martínez',
    status: 'ai',
    unread_count: 0,
    last_message_at: minsAgo(55),
    last_message_preview: 'Muchas gracias por la información',
    booking_stage: 'lead',
    notes: null,
    guest_language: 'es',
    created_at: daysAgo(1),
    updated_at: minsAgo(55),
  },
  {
    id: 'conv-4',
    provider_id: 'demo-provider',
    guest_phone: '+44207555-0444',
    guest_name: 'Sophie Chen',
    status: 'ai',
    unread_count: 1,
    last_message_at: minsAgo(180),
    last_message_preview: 'Do you have availability for 4 nights?',
    booking_stage: 'lead',
    notes: null,
    guest_language: 'en',
    created_at: daysAgo(0),
    updated_at: minsAgo(180),
  },
  {
    id: 'conv-5',
    provider_id: 'demo-provider',
    guest_phone: '+58424555-0505',
    guest_name: null,
    status: 'closed',
    unread_count: 0,
    last_message_at: daysAgo(3),
    last_message_preview: 'Gracias, estuvo todo perfecto',
    booking_stage: 'closed',
    notes: null,
    guest_language: 'es',
    created_at: daysAgo(7),
    updated_at: daysAgo(3),
  },
];

type ConvWithMessages = WaConversation & { messages?: WaMessage[] };

const MOCK_THREADS: Record<string, WaMessage[]> = {
  'conv-1': [
    {
      id: 'm1-1', conversation_id: 'conv-1', wa_message_id: null,
      role: 'inbound', content: 'Hola! Vi su posada en internet y me interesa reservar para diciembre.', content_en: 'Hello! I saw your posada online and I\'m interested in booking for December.',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.9, created_at: daysAgo(2),
    },
    {
      id: 'm1-2', conversation_id: 'conv-1', wa_message_id: null,
      role: 'outbound', content: '¡Hola María! Bienvenida 🌴 Tenemos disponibilidad en diciembre. ¿Para cuántas noches y cuántas personas?', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(2),
    },
    {
      id: 'm1-3', conversation_id: 'conv-1', wa_message_id: null,
      role: 'inbound', content: 'Para 5 noches, del 20 al 25 de diciembre. Somos 2 adultos y 1 niño.', content_en: 'For 5 nights, December 20–25. We are 2 adults and 1 child.',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: daysAgo(2),
    },
    {
      id: 'm1-4', conversation_id: 'conv-1', wa_message_id: null,
      role: 'outbound', content: 'Perfecto! Para esas fechas, la Habitación Doble Deluxe está disponible. El precio es $180/noche, total $900 para 5 noches. Incluye desayuno criollo para todos.', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(2),
    },
    {
      id: 'm1-5', conversation_id: 'conv-1', wa_message_id: null,
      role: 'inbound', content: 'Okay me parece bien. ¿Cómo hago el pago?', content_en: 'Okay that sounds good. How do I make the payment?',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.8, created_at: minsAgo(90),
    },
    {
      id: 'm1-6', conversation_id: 'conv-1', wa_message_id: null,
      role: 'outbound', content: 'Aceptamos transferencia Zelle a pagos@posada.com o pago en efectivo USD al llegar. Para confirmar, pedimos 30% de depósito ($270).', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: minsAgo(89),
    },
    {
      id: 'm1-7', conversation_id: 'conv-1', wa_message_id: null,
      role: 'inbound', content: 'No entiendo por qué el precio cambió! Antes decía $150 la noche en la página web', content_en: 'I don\'t understand why the price changed! Before it said $150/night on the webpage',
      detected_lang: 'es', is_ai: false, flagged: true, flag_reason: 'negative_sentiment', sentiment_score: 0.2, created_at: minsAgo(4),
    },
  ],
  'conv-2': [
    {
      id: 'm2-1', conversation_id: 'conv-2', wa_message_id: null,
      role: 'inbound', content: 'Hi! I booked 3 nights starting tomorrow. Just confirming everything is set?', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: daysAgo(4),
    },
    {
      id: 'm2-2', conversation_id: 'conv-2', wa_message_id: null,
      role: 'outbound', content: 'Hi James! Yes, all confirmed for tomorrow. Your room (Suite 2) is ready. Check-in is from 2pm. Do you need airport pickup?', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(4),
    },
    {
      id: 'm2-3', conversation_id: 'conv-2', wa_message_id: null,
      role: 'inbound', content: 'That\'d be great actually. We land at 1pm at Maiquetia.', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.9, created_at: daysAgo(3),
    },
    {
      id: 'm2-4', conversation_id: 'conv-2', wa_message_id: null,
      role: 'outbound', content: 'I\'ll arrange that for you. Our driver Carlos will be at arrivals with a sign. The transfer is $45. I\'ll send his WhatsApp number shortly.', content_en: null,
      detected_lang: null, is_ai: false, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(3),
    },
    {
      id: 'm2-5', conversation_id: 'conv-2', wa_message_id: null,
      role: 'inbound', content: 'Sounds good. Do you have a pool?', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.9, created_at: minsAgo(25),
    },
    {
      id: 'm2-6', conversation_id: 'conv-2', wa_message_id: null,
      role: 'outbound', content: 'Yes! Heated pool open 7am–10pm, plus a jacuzzi. Towels provided. We also have a bar by the pool 🍹', content_en: null,
      detected_lang: null, is_ai: false, flagged: false, flag_reason: null, sentiment_score: null, created_at: minsAgo(23),
    },
    {
      id: 'm2-7', conversation_id: 'conv-2', wa_message_id: null,
      role: 'inbound', content: 'Perfect, we\'ll arrive around 3pm then', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.95, created_at: minsAgo(22),
    },
  ],
  'conv-3': [
    {
      id: 'm3-1', conversation_id: 'conv-3', wa_message_id: null,
      role: 'inbound', content: 'Buenas tardes, ¿tienen habitaciones disponibles para enero?', content_en: 'Good afternoon, do you have rooms available for January?',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: daysAgo(1),
    },
    {
      id: 'm3-2', conversation_id: 'conv-3', wa_message_id: null,
      role: 'outbound', content: '¡Buenas tardes Carlos! Sí, tenemos disponibilidad en enero. ¿Qué fechas tiene en mente y cuántas personas serían?', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(1),
    },
    {
      id: 'm3-3', conversation_id: 'conv-3', wa_message_id: null,
      role: 'inbound', content: 'Del 10 al 15 de enero, 2 personas. ¿Cuánto costaría?', content_en: 'From January 10 to 15, 2 people. How much would it cost?',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: daysAgo(1),
    },
    {
      id: 'm3-4', conversation_id: 'conv-3', wa_message_id: null,
      role: 'outbound', content: 'Para esas fechas, la Habitación Estándar Doble está a $120/noche. Por 5 noches serían $600, desayuno incluido. También tenemos Suite Deluxe a $160/noche si prefieren más espacio.', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(1),
    },
    {
      id: 'm3-5', conversation_id: 'conv-3', wa_message_id: null,
      role: 'inbound', content: 'Muchas gracias por la información', content_en: 'Thank you very much for the information',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.9, created_at: minsAgo(55),
    },
  ],
  'conv-4': [
    {
      id: 'm4-1', conversation_id: 'conv-4', wa_message_id: null,
      role: 'inbound', content: 'Hello! Do you have availability for 4 nights in February?', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: minsAgo(195),
    },
    {
      id: 'm4-2', conversation_id: 'conv-4', wa_message_id: null,
      role: 'outbound', content: 'Hi Sophie! Welcome 🌴 Yes, February is available. Which dates were you thinking? We have lovely rooms with garden or pool views.', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: minsAgo(194),
    },
    {
      id: 'm4-3', conversation_id: 'conv-4', wa_message_id: null,
      role: 'inbound', content: 'Do you have availability for 4 nights?', content_en: null,
      detected_lang: 'en', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: minsAgo(180),
    },
  ],
  'conv-5': [
    {
      id: 'm5-1', conversation_id: 'conv-5', wa_message_id: null,
      role: 'inbound', content: 'Quiero reservar 3 noches para noviembre', content_en: 'I want to book 3 nights in November',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.85, created_at: daysAgo(7),
    },
    {
      id: 'm5-2', conversation_id: 'conv-5', wa_message_id: null,
      role: 'outbound', content: '¡Hola! Con gusto. Tenemos la Habitación Estándar disponible. ¿Qué fechas exactas?', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(7),
    },
    {
      id: 'm5-3', conversation_id: 'conv-5', wa_message_id: null,
      role: 'inbound', content: 'Del 5 al 8. Perfecto. Procedo con el pago.', content_en: 'From the 5th to the 8th. Perfect. I\'ll proceed with payment.',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.9, created_at: daysAgo(6),
    },
    {
      id: 'm5-4', conversation_id: 'conv-5', wa_message_id: null,
      role: 'outbound', content: 'Confirmado ✅ Les esperamos del 5 al 8 de noviembre. Recibirán instrucciones de llegada pronto.', content_en: null,
      detected_lang: null, is_ai: true, flagged: false, flag_reason: null, sentiment_score: null, created_at: daysAgo(6),
    },
    {
      id: 'm5-5', conversation_id: 'conv-5', wa_message_id: null,
      role: 'inbound', content: 'Gracias, estuvo todo perfecto', content_en: 'Thank you, everything was perfect',
      detected_lang: 'es', is_ai: false, flagged: false, flag_reason: null, sentiment_score: 0.98, created_at: daysAgo(3),
    },
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WaConversationStatus, { label: string; badge: string; dot: string }> = {
  ai:        { label: 'AI',        badge: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500' },
  human:     { label: 'Human',     badge: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500'  },
  escalated: { label: 'Escalated', badge: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500'   },
  closed:    { label: 'Closed',    badge: 'bg-gray-100 text-gray-500 border-gray-200',     dot: 'bg-gray-400'  },
};

const STAGE_CONFIG: Record<WaBookingStage, { label: string; color: string }> = {
  lead:       { label: 'Lead',       color: 'text-muted-foreground' },
  quoted:     { label: 'Quoted',     color: 'text-yellow-700'       },
  confirmed:  { label: 'Confirmed',  color: 'text-green-700'        },
  checked_in: { label: 'Checked In', color: 'text-blue-700'         },
  closed:     { label: 'Closed',     color: 'text-muted-foreground' },
};

type FilterTab = 'all' | WaConversationStatus;

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

function useClientNow() {
  const [now, setNow] = useState(REFERENCE_EPOCH);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  return now;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isOut = msg.role === 'outbound';
  const [showTranslation, setShowTranslation] = useState(false);
  const hasTranslation = !!(msg.content_en && msg.content_en !== msg.content);

  return (
    <div className={cn('flex gap-2 mb-2', isOut ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="w-6 h-6 shrink-0 mt-auto">
        <AvatarFallback className="text-[10px] bg-muted">
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
              className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
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
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
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
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2">{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}

function StatsStrip({ conversations }: { conversations: WaConversation[] }) {
  const counts = {
    total:     conversations.length,
    ai:        conversations.filter((c) => c.status === 'ai').length,
    human:     conversations.filter((c) => c.status === 'human').length,
    escalated: conversations.filter((c) => c.status === 'escalated').length,
  };
  return (
    <div className="grid grid-cols-4 divide-x border-b">
      {[
        { label: 'Total',     value: counts.total,     color: 'text-foreground' },
        { label: 'AI',        value: counts.ai,        color: 'text-green-600'  },
        { label: 'Human',     value: counts.human,     color: 'text-blue-600'   },
        { label: 'Escalated', value: counts.escalated, color: 'text-red-600'    },
      ].map(({ label, value, color }) => (
        <div key={label} className="py-2.5 text-center">
          <p className={cn('text-base font-bold', color)}>{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
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

// ─── Main demo page ───────────────────────────────────────────────────────────

export default function WhatsAppDemoPage() {
  const [conversations, setConversations] = useState<(WaConversation & { messages?: WaMessage[] })[]>(
    MOCK_CONVERSATIONS.map((c) => ({ ...c, messages: MOCK_THREADS[c.id] ?? [] }))
  );
  const [selected, setSelected] = useState<(WaConversation & { messages?: WaMessage[] }) | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientNow = useClientNow();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages?.length]);

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
    const updated = {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  const filteredConvs = conversations
    .filter((c) => filter === 'all' || c.status === filter)
    .sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

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
          <div className="w-[280px] flex-shrink-0 border-r flex flex-col bg-background">
            <div className="px-4 py-3.5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-semibold">Messages</h1>
                  <p className="text-xs text-muted-foreground">WhatsApp · AI concierge</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Refresh (demo)">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <StatsStrip conversations={conversations} />

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

            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <NoConversationsState filter={filter} />
              ) : (
                filteredConvs.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    selected={selected?.id === conv.id}
                    onClick={() => selectConv(conv.id)}
                    now={clientNow}
                  />
                ))
              )}
            </div>
          </div>

          {/* Center: thread */}
          <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
            {selected ? (
              <>
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
                  {(selected.messages ?? []).length === 0 ? (
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
                    <div className="flex gap-2 items-end">
                      <textarea
                        className="flex-1 resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground min-h-[40px] max-h-28"
                        rows={1}
                        placeholder="Message guest…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Button
                        size="sm"
                        className="h-10 w-10 p-0 shrink-0"
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">↵ Send · ⇧↵ New line</p>
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

          {/* Right: controls */}
          {selected && (
            <div className="w-52 flex-shrink-0 flex flex-col overflow-y-auto bg-background">
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
                          active
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Quick Actions
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
                    className="w-full text-xs h-7 justify-start text-destructive hover:text-destructive"
                    onClick={() => updateStage('closed')}
                  >
                    <CheckCheck className="w-3 h-3 mr-1.5" />
                    Mark Closed
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
