'use client';

import AiSettingsPanel, { type AiConfig } from '@/components/whatsapp/AiSettingsPanel';

const DEMO_CONFIG: AiConfig = {
  phone_number_id:       '108765432100001',
  access_token:          'EAAG3xDemoTokenXXXXXXXXXXXXXXX',
  verify_token:          'demo-verify-token-abc123xyz',
  persona_name:          'Sofía',
  persona_bio:           'Soy la asistente virtual de Posada El Sol. Conozco cada habitación, precio y rincón de la zona. Me encanta ayudar a los huéspedes a planificar su estadía perfecta en Mochima.',
  greeting_style:        'friendly',
  custom_greeting:       null,
  tone_formality:        'casual',
  tone_language:         'bilingual',
  response_length:       'standard',
  booking_pressure:      'soft',
  emoji_style:           'moderate',
  upsell_enabled:        true,
  sentiment_threshold:   0.3,
  value_escalation_usd:  500,
  escalation_keywords:   ['reembolso', 'queja', 'refund', 'complaint', 'manager'],
  response_delay_ms:     1500,
  working_hours_enabled: true,
  working_hours: {
    mon: { active: true,  start: '09:00', end: '21:00' },
    tue: { active: true,  start: '09:00', end: '21:00' },
    wed: { active: true,  start: '09:00', end: '21:00' },
    thu: { active: true,  start: '09:00', end: '21:00' },
    fri: { active: true,  start: '09:00', end: '22:00' },
    sat: { active: true,  start: '08:00', end: '22:00' },
    sun: { active: false, start: '10:00', end: '19:00' },
  },
  after_hours_message:  '¡Hola! Nuestro equipo está fuera de línea ahora mismo. Te responderemos mañana en cuanto abramos. ¡Gracias por tu paciencia! 🌙',
  custom_instructions:  '- Always ask for check-in date before quoting a price.\n- Mention the pool and included breakfast in every quote.\n- If a group exceeds 8 people, escalate to the owner.',
  ai_enabled:           true,
};

export default function WhatsAppSettingsDemoPage() {
  return (
    <div className="min-h-screen bg-muted/10">
      <div className="max-w-5xl mx-auto p-6">
        <AiSettingsPanel
          initialConfig={DEMO_CONFIG}
          isDemo
          siteUrl="https://vztravel.app"
        />
      </div>
    </div>
  );
}
