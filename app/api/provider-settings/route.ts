import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminAuth } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'provider-settings.json');

type ProviderPaymentSettings = {
  payout_method: string;
  zelle_email: string;
  zelle_phone: string;
  usdt_address: string;
  usdt_network: string;
  binance_username: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  bank_name: string;
  updated_at: string | null;
};

function readSettings(): Record<string, ProviderPaymentSettings> {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSettings(data: Record<string, ProviderPaymentSettings>): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  let provider_id = searchParams.get('provider_id');

  // If provider_id not supplied, derive from the authenticated Supabase session
  if (!provider_id) {
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
    provider_id = provider.id as string;
  }

  const all = readSettings();
  const settings = all[provider_id] ?? null;
  return NextResponse.json({ data: settings });
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { provider_id: bodyProviderId, ...rest } = body as unknown as Record<string, unknown>;

  // Derive provider_id from session if not supplied in body
  let provider_id = bodyProviderId as string | undefined;
  if (!provider_id) {
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
    provider_id = provider.id as string;
  }
  const all = readSettings();
  all[provider_id as string] = {
    ...(all[provider_id as string] || {}),
    ...(rest as Partial<ProviderPaymentSettings>),
    updated_at: new Date().toISOString(),
  } as ProviderPaymentSettings;
  writeSettings(all);
  return NextResponse.json({ data: all[provider_id as string] });
}
