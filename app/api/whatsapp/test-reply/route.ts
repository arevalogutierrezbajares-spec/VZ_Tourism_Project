import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildSystemPrompt } from '@/lib/whatsapp-ai';
import { getGroqClient, GROQ_MODEL } from '@/lib/groq';
import type { PosadaWhatsappConfig, PosadaKnowledge } from '@/types/database';

/**
 * POST /api/whatsapp/test-reply
 * Generates a test AI reply using the provided (unsaved) config & knowledge.
 * Used by the setup wizard to preview agent behaviour before going live.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { message?: string; config?: Partial<PosadaWhatsappConfig>; knowledge?: Partial<PosadaKnowledge>; provider_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, config, knowledge, provider_name } = body;
  if (!message || typeof message !== 'string' || message.length > 1000) {
    return NextResponse.json({ error: 'message is required (max 1000 chars)' }, { status: 400 });
  }

  // Build a minimal config object with defaults for missing fields
  const fullConfig = {
    id: 'test',
    provider_id: 'test',
    phone_number_id: '',
    access_token: '',
    verify_token: '',
    persona_name: 'Asistente',
    persona_bio: null,
    greeting_style: 'friendly' as const,
    custom_greeting: null,
    tone_formality: 'casual' as const,
    tone_language: 'es' as const,
    response_length: 'standard' as const,
    booking_pressure: 'soft' as const,
    emoji_style: 'moderate' as const,
    upsell_enabled: true,
    sentiment_threshold: 0.3,
    value_escalation_usd: 0,
    escalation_keywords: [],
    response_delay_ms: 0,
    working_hours_enabled: false,
    working_hours: null,
    after_hours_message: null,
    custom_instructions: null,
    ai_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...config,
  } satisfies PosadaWhatsappConfig;

  const fullKnowledge = knowledge ? {
    id: 'test',
    provider_id: 'test',
    property_description: null,
    location_details: null,
    room_types: [],
    amenities: [],
    policies: {},
    faqs: [],
    booking_process: null,
    payment_methods: [],
    nearby_attractions: null,
    languages_spoken: [],
    special_notes: null,
    pricing_rules: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...knowledge,
  } satisfies PosadaKnowledge : null;

  try {
    const systemPrompt = buildSystemPrompt({
      config: fullConfig,
      providerName: provider_name || fullConfig.persona_name || 'Posada',
      providerDescription: fullKnowledge?.property_description || '',
      providerRegion: fullKnowledge?.location_details || '',
      inboundText: message,
      history: [],
      knowledge: fullKnowledge,
    });

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: fullConfig.response_length === 'brief' ? 150 : 400,
      temperature: 0.3,
      top_p: 0.9,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[test-reply] Groq error:', err);
    return NextResponse.json({ error: 'Failed to generate test reply' }, { status: 502 });
  }
}
