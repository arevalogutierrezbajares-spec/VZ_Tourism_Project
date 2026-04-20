'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import AiSettingsPanel, { type AiConfig } from '@/components/whatsapp/AiSettingsPanel';
import type { PosadaWhatsappConfig } from '@/types/database';

const DEFAULT_CONFIG: AiConfig = {
  phone_number_id:        '',
  access_token:           '',
  verify_token:           '',
  persona_name:           'Asistente',
  persona_bio:            null,
  greeting_style:         'friendly',
  custom_greeting:        null,
  tone_formality:         'casual',
  tone_language:          'es',
  response_length:        'standard',
  booking_pressure:       'soft',
  emoji_style:            'moderate',
  upsell_enabled:         true,
  sentiment_threshold:    0.3,
  value_escalation_usd:   0,
  escalation_keywords:    [],
  response_delay_ms:      0,
  working_hours_enabled:  false,
  working_hours:          null,
  after_hours_message:    null,
  custom_instructions:    null,
  ai_enabled:             true,
};

export default function AiSettingsPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteUrl, setSiteUrl] = useState('');
  const [plaintextFallback, setPlaintextFallback] = useState(false);

  useEffect(() => {
    setSiteUrl(window.location.origin);

    fetch('/api/whatsapp/config')
      .then((r) => r.json())
      .then(({ data }: { data: PosadaWhatsappConfig | null }) => {
        setConfig(data ? {
          phone_number_id:       data.phone_number_id,
          access_token:          data.access_token ?? '',
          verify_token:          data.verify_token,
          persona_name:          data.persona_name,
          persona_bio:           data.persona_bio,
          greeting_style:        data.greeting_style ?? 'friendly',
          custom_greeting:       data.custom_greeting ?? null,
          tone_formality:        data.tone_formality,
          tone_language:         data.tone_language,
          response_length:       data.response_length,
          booking_pressure:      data.booking_pressure,
          emoji_style:           data.emoji_style ?? 'moderate',
          upsell_enabled:        data.upsell_enabled,
          sentiment_threshold:   data.sentiment_threshold ?? 0.3,
          value_escalation_usd:  data.value_escalation_usd ?? 0,
          escalation_keywords:   data.escalation_keywords ?? [],
          response_delay_ms:     data.response_delay_ms ?? 0,
          working_hours_enabled: data.working_hours_enabled ?? false,
          working_hours:         data.working_hours ?? null,
          after_hours_message:   data.after_hours_message ?? null,
          custom_instructions:   data.custom_instructions,
          ai_enabled:            data.ai_enabled,
        } : DEFAULT_CONFIG);
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (patch: Partial<AiConfig>) => {
    const res = await fetch('/api/whatsapp/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Save failed');
    const json = await res.json() as { plaintext_fallback?: boolean };
    if (json.plaintext_fallback) {
      setPlaintextFallback(true);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6">
        <div className="w-52 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plaintextFallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          Token stored in plaintext — Vault unavailable. Configure Supabase Vault for production security.
        </div>
      )}
      <AiSettingsPanel
        initialConfig={config!}
        onSave={handleSave}
        siteUrl={siteUrl}
      />
    </div>
  );
}
