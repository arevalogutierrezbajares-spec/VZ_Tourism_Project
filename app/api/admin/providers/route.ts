import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProviders,
  createProvider,
  updateProvider,
  moveProviderToStage,
  addNote,
  type ProviderStage,
  type ProviderTier,
} from '@/lib/providers-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const tier = searchParams.get('tier');
  const type = searchParams.get('type');
  const stage = searchParams.get('stage') as ProviderStage | null;

  let providers = getAllProviders();

  if (region) providers = providers.filter((p) => p.region === region);
  if (tier) providers = providers.filter((p) => p.tier === tier);
  if (type) providers = providers.filter((p) => p.type === type);
  if (stage) providers = providers.filter((p) => p.stage === stage);

  return NextResponse.json({ providers });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { business_id, business_name, type, region, tier, phone, cover_image_url, avg_rating } = body;

  if (!business_id || !business_name || !region) {
    return NextResponse.json({ error: 'business_id, business_name, and region are required' }, { status: 400 });
  }

  const provider = createProvider({
    business_id,
    business_name,
    type: type || 'hotel',
    region,
    stage: 'lead',
    tier: (tier as ProviderTier) || 'B',
    entered_stage_at: new Date().toISOString(),
    phone: phone || null,
    cover_image_url: cover_image_url || null,
    avg_rating: avg_rating || null,
    notes: [],
    contact_history: [],
    assigned_to: null,
  });

  return NextResponse.json({ provider }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, action, ...rest } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let result;

  if (action === 'move_stage') {
    result = moveProviderToStage(id, rest.stage as ProviderStage);
  } else if (action === 'add_note') {
    result = addNote(id, rest.text);
  } else {
    result = updateProvider(id, rest);
  }

  if (!result) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  return NextResponse.json({ provider: result });
}
