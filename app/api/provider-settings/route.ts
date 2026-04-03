import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminAuth } from '@/lib/admin-auth';

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
  const provider_id = searchParams.get('provider_id') || 'prov_001'; // TODO: derive from real session
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

  const { provider_id = 'prov_001', ...rest } = body as Record<string, unknown>; // TODO: derive provider_id from real session
  const all = readSettings();
  all[provider_id as string] = {
    ...(all[provider_id as string] || {}),
    ...(rest as Partial<ProviderPaymentSettings>),
    updated_at: new Date().toISOString(),
  } as ProviderPaymentSettings;
  writeSettings(all);
  return NextResponse.json({ data: all[provider_id as string] });
}
