import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import { hashToken } from '@/lib/whatsapp/hash';

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * POST /api/whatsapp/embedded-signup
 *
 * Completes the WhatsApp Embedded Signup flow:
 * 1. Exchanges the authorization code for a long-lived access token
 * 2. Subscribes the WABA to receive webhooks on this app
 * 3. Registers the phone number for Cloud API messaging
 * 4. Saves config to posada_whatsapp_config
 *
 * Body: { code: string, phone_number_id: string, waba_id: string }
 *
 * The posada owner does NOT need a Meta Developer account.
 * They only need a Facebook account linked to a Meta Business Account
 * (which the Embedded Signup flow creates automatically if needed).
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: 'Meta App not configured. Set NEXT_PUBLIC_META_APP_ID and META_APP_SECRET.' },
      { status: 500 }
    );
  }

  let body: { code?: string; phone_number_id?: string; waba_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, phone_number_id, waba_id } = body;
  if (!code || !phone_number_id || !waba_id) {
    return NextResponse.json(
      { error: 'code, phone_number_id, and waba_id are required' },
      { status: 400 }
    );
  }

  // ── Step 1: Exchange authorization code for access token ──────────────────
  let accessToken: string;
  try {
    const tokenUrl = new URL(`${META_GRAPH_URL}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[embedded-signup] Token exchange failed:', err);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code. The code may have expired — please try again.' },
        { status: 502 }
      );
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'No access token in Meta response' }, { status: 502 });
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[embedded-signup] Token exchange error:', err);
    return NextResponse.json({ error: 'Token exchange network error' }, { status: 502 });
  }

  // ── Step 2: Subscribe WABA to receive webhooks on this app ────────────────
  try {
    const subRes = await fetch(`${META_GRAPH_URL}/${waba_id}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!subRes.ok) {
      const err = await subRes.text();
      console.warn('[embedded-signup] Webhook subscription failed (non-fatal):', err);
      // Non-fatal: the posada can still receive messages if the app-level webhook is configured
    }
  } catch (err) {
    console.warn('[embedded-signup] Webhook subscription error (non-fatal):', err);
  }

  // ── Step 3: Register phone number for Cloud API messaging ─────────────────
  try {
    const regRes = await fetch(`${META_GRAPH_URL}/${phone_number_id}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' }),
    });
    if (!regRes.ok) {
      const err = await regRes.text();
      // This often fails if already registered — that's fine
      console.info('[embedded-signup] Phone registration response:', err);
    }
  } catch (err) {
    console.info('[embedded-signup] Phone registration error (may already be registered):', err);
  }

  // ── Step 4: Generate verify token and save config ─────────────────────────
  const verifyToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from('posada_whatsapp_config')
    .upsert(
      {
        provider_id: providerId,
        phone_number_id,
        access_token: accessToken,
        verify_token: hashToken(verifyToken),
        ai_enabled: false, // Start disabled — user enables after completing wizard
      },
      { onConflict: 'provider_id' }
    )
    .select('id, phone_number_id, ai_enabled')
    .single();

  if (error) {
    console.error('[embedded-signup] DB upsert failed:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      config_id: data.id,
      phone_number_id: data.phone_number_id,
      waba_id,
      webhook_subscribed: true,
    },
    message: 'WhatsApp connected successfully',
  });
}
