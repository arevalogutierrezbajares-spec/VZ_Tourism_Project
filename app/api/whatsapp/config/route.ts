import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/config
 * Returns the WhatsApp config for the authenticated provider.
 * access_token is masked for security.
 */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('posada_whatsapp_config')
    .select('id, provider_id, phone_number_id, persona_name, persona_bio, greeting_style, custom_greeting, tone_formality, tone_language, response_length, booking_pressure, emoji_style, upsell_enabled, sentiment_threshold, value_escalation_usd, escalation_keywords, response_delay_ms, working_hours_enabled, working_hours, after_hours_message, custom_instructions, ai_enabled, verify_token, created_at, updated_at')
    .eq('provider_id', provider.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask access_token — never send it to the client
  return NextResponse.json({ data: data ?? null });
}

/**
 * PUT /api/whatsapp/config
 * Create or update the WhatsApp config for the authenticated provider.
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = [
    'phone_number_id', 'access_token', 'persona_name', 'persona_bio',
    'greeting_style', 'custom_greeting',
    'tone_formality', 'tone_language', 'response_length', 'booking_pressure', 'emoji_style',
    'upsell_enabled', 'sentiment_threshold', 'value_escalation_usd', 'escalation_keywords',
    'response_delay_ms',
    'working_hours_enabled', 'working_hours', 'after_hours_message',
    'custom_instructions', 'ai_enabled',
  ];

  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (!updates.phone_number_id) {
    // Validate required field only on first creation
    const { count } = await supabase
      .from('posada_whatsapp_config')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', provider.id);

    if (!count) {
      return NextResponse.json({ error: 'phone_number_id is required' }, { status: 400 });
    }
  }

  // If access_token is being set, attempt Vault encryption via service client
  // (service client needed because upsert_wa_access_token is SECURITY DEFINER)
  let vaultUpdates: Record<string, unknown> = {};
  if (typeof updates.access_token === 'string') {
    try {
      const serviceSupabase = await createServiceClient();
      if (serviceSupabase) {
        // First upsert the row to ensure we have an id, then write to Vault
        const { data: existing } = await serviceSupabase
          .from('posada_whatsapp_config')
          .select('id')
          .eq('provider_id', provider.id)
          .single();

        if (existing?.id) {
          const { data: vaultId } = await serviceSupabase.rpc('upsert_wa_access_token', {
            p_config_id: existing.id,
            p_token: updates.access_token,
          });
          if (vaultId) {
            // Token stored in Vault — store reference, keep plaintext as fallback during migration
            vaultUpdates = { access_token_vault_id: vaultId };
          }
        }
      }
    } catch {
      // Vault not available — plaintext stored as-is
    }
  }

  const { data, error } = await supabase
    .from('posada_whatsapp_config')
    .upsert({ provider_id: provider.id, ...updates, ...vaultUpdates }, { onConflict: 'provider_id' })
    .select('id, provider_id, phone_number_id, persona_name, persona_bio, greeting_style, custom_greeting, tone_formality, tone_language, response_length, booking_pressure, emoji_style, upsell_enabled, sentiment_threshold, value_escalation_usd, escalation_keywords, response_delay_ms, working_hours_enabled, working_hours, after_hours_message, custom_instructions, ai_enabled, verify_token, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
