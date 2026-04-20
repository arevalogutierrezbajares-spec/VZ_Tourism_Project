import type {
  WaConversation, WaMessage,
} from '@/types/database';

// Use a fixed reference epoch so SSR and CSR produce identical timestamps
// (avoids hydration mismatch from Date.now() differing between server and client).

const REFERENCE_EPOCH = new Date('2026-04-20T14:00:00Z').getTime();
const minsAgo = (n: number) => new Date(REFERENCE_EPOCH - n * 60000).toISOString();
const daysAgo = (n: number) => new Date(REFERENCE_EPOCH - n * 86400000).toISOString();

export { REFERENCE_EPOCH };

export const MOCK_CONVERSATIONS: WaConversation[] = [
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

export const MOCK_THREADS: Record<string, WaMessage[]> = {
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
