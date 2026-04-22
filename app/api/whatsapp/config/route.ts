import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { hashToken } from '@/lib/whatsapp/hash';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import { ConfigUpdateSchema } from '@/lib/whatsapp/schemas';
import { rateLimit } from '@/lib/api/rate-limit';

/**
 * GET /api/whatsapp/config
 * Returns the WhatsApp config for the authenticated provider.
 * access_token is masked for security.
 */
export async function GET() {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const { data, error } = await supabase
    .from('posada_whatsapp_config')
    .select('id, provider_id, phone_number_id, persona_name, persona_bio, greeting_style, custom_greeting, tone_formality, tone_language, response_length, booking_pressure, emoji_style, upsell_enabled, sentiment_threshold, value_escalation_usd, escalation_keywords, response_delay_ms, working_hours_enabled, working_hours, after_hours_message, custom_instructions, ai_enabled, verify_token, created_at, updated_at')
    .eq('provider_id', providerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[whatsapp/config] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }

  // Mask secrets — never send raw tokens to the client
  if (data?.verify_token) {
    (data as Record<string, unknown>).verify_token = '••••••••';
  }
  return NextResponse.json({ data: data ?? null });
}

/**
 * PUT /api/whatsapp/config
 * Create or update the WhatsApp config for the authenticated provider.
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const rateLimitRes = await rateLimit(`api:${providerId}`, 20);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ConfigUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data };

  // Hash verify_token before storing — never store plaintext.
  // Preserve the plaintext to return in the response (shown once for Meta setup).
  const plaintextVerifyToken = typeof updates.verify_token === 'string' ? updates.verify_token : null;
  if (plaintextVerifyToken) {
    updates.verify_token = hashToken(plaintextVerifyToken);
  }

  if (!updates.phone_number_id) {
    // Validate required field only on first creation
    const { count } = await supabase
      .from('posada_whatsapp_config')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerId);

    if (!count) {
      return NextResponse.json({ error: 'phone_number_id is required' }, { status: 400 });
    }
  }

  // If access_token is being set, attempt Vault encryption via service client
  // (service client needed because upsert_wa_access_token is SECURITY DEFINER)
  let vaultUpdates: Record<string, unknown> = {};
  let plaintextFallback = false;
  if (typeof updates.access_token === 'string') {
    let vaultSuccess = false;
    try {
      const serviceSupabase = await createServiceClient();
      if (serviceSupabase) {
        // First upsert the row to ensure we have an id, then write to Vault
        const { data: existing } = await serviceSupabase
          .from('posada_whatsapp_config')
          .select('id')
          .eq('provider_id', providerId)
          .single();

        if (existing?.id) {
          const { data: vaultId } = await serviceSupabase.rpc('upsert_wa_access_token', {
            p_config_id: existing.id,
            p_token: updates.access_token,
          });
          if (vaultId) {
            // Token stored in Vault — store reference, keep plaintext as fallback during migration
            vaultUpdates = { access_token_vault_id: vaultId };
            vaultSuccess = true;
          }
        }
      }
    } catch {
      // Vault not available — plaintext stored as-is
    }
    if (!vaultSuccess) {
      console.warn('[WhatsApp Token] Vault write failed — token stored in plaintext as fallback. Rotate token and configure Vault for production.');
      plaintextFallback = true;
    }
  }

  const { data, error } = await supabase
    .from('posada_whatsapp_config')
    .upsert({ provider_id: providerId, ...updates, ...vaultUpdates }, { onConflict: 'provider_id' })
    .select('id, provider_id, phone_number_id, persona_name, persona_bio, greeting_style, custom_greeting, tone_formality, tone_language, response_length, booking_pressure, emoji_style, upsell_enabled, sentiment_threshold, value_escalation_usd, escalation_keywords, response_delay_ms, working_hours_enabled, working_hours, after_hours_message, custom_instructions, ai_enabled, verify_token, updated_at')
    .single();

  if (error) {
    console.error('[whatsapp/config] PUT error:', error.message);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }

  // Return plaintext verify_token in response so UI can display it once for Meta setup.
  // After this response, subsequent GETs will return a masked placeholder.
  const responseData = { ...data } as Record<string, unknown>;
  delete responseData.access_token;
  delete responseData.access_token_vault_id;
  if (plaintextVerifyToken) {
    responseData.verify_token = plaintextVerifyToken;
  }

  return NextResponse.json({ data: responseData, plaintext_fallback: plaintextFallback });
}
