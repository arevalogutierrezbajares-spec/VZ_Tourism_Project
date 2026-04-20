import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const PMS_API_URL = process.env.PMS_API_URL || 'http://localhost:3001';
const PMS_BRIDGE_SECRET = process.env.PMS_BRIDGE_SECRET || 'vav-bridge-dev-secret-2026';

/**
 * POST /api/whatsapp/knowledge/sync-pms
 * Pulls property + unit type data from PMS and upserts into WhatsApp knowledge base.
 * Only overwrites PMS-sourced fields; preserves human-edited content.
 */
export async function POST() {
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

  // ── Get PMS token (reuse bridge auth pattern) ─────────────────────────────
  const cookieStore = await cookies();
  let pmsToken = cookieStore.get('pms_token')?.value;
  const pmsPropertyId = cookieStore.get('pms_property_id')?.value;

  if (!pmsToken) {
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] || 'Provider';

    const bridgeRes = await fetch(`${PMS_API_URL}/auth/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_secret: PMS_BRIDGE_SECRET,
        supabase_user_id: user.id,
        email: user.email,
        name,
      }),
    });

    if (!bridgeRes.ok) {
      return NextResponse.json({ error: 'PMS not available' }, { status: 502 });
    }

    const bridgeData = await bridgeRes.json() as {
      accessToken: string;
      user: { id: string; defaultPropertyId?: string };
    };
    pmsToken = bridgeData.accessToken;
  }

  // ── Fetch PMS data ────────────────────────────────────────────────────────
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${pmsToken}`,
    'Content-Type': 'application/json',
  };
  if (pmsPropertyId) headers['X-Property-Id'] = pmsPropertyId;

  const [propRes, typesRes] = await Promise.all([
    fetch(`${PMS_API_URL}/properties/current`, { headers }),
    fetch(`${PMS_API_URL}/units/types`, { headers }),
  ]);

  if (!propRes.ok) {
    return NextResponse.json({ error: 'Could not fetch PMS property', synced_fields: [] }, { status: 502 });
  }

  const property = await propRes.json() as {
    name: string; address: string; city: string; state: string;
    phone: string | null; email: string | null;
  };

  const unitTypes = typesRes.ok
    ? (await typesRes.json() as { name: string; base_rate_cents: number; max_adults: number; max_children: number; amenities: string[] }[])
    : [];

  // ── Map PMS data to knowledge fields ──────────────────────────────────────
  const propertyDescription = `${property.name} — located in ${property.city}, ${property.state}, Venezuela.${property.address ? ` Address: ${property.address}.` : ''}`;
  const locationDetails = `${property.city}, ${property.state}, Venezuela`;

  const roomTypes = unitTypes.map((ut) => ({
    name: ut.name,
    capacity: ut.max_adults + (ut.max_children || 0),
    price_usd: ut.base_rate_cents / 100,
    description: '',
    amenities: ut.amenities || [],
  }));

  // Union of all unit type amenities
  const pmsAmenities = [...new Set(unitTypes.flatMap((ut) => ut.amenities || []))];

  // ── Load existing knowledge & merge ───────────────────────────────────────
  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: existing } = await svc
    .from('posada_knowledge')
    .select('*')
    .eq('provider_id', provider.id)
    .single();

  // Merge amenities: keep existing human-added + add PMS-derived
  const existingAmenities: string[] = existing?.amenities ?? [];
  const mergedAmenities = [...new Set([...existingAmenities, ...pmsAmenities])];

  const syncPatch = {
    provider_id: provider.id,
    property_description: propertyDescription,
    location_details: locationDetails,
    room_types: roomTypes,
    amenities: mergedAmenities,
  };

  const { data: updated, error: upsertError } = await svc
    .from('posada_knowledge')
    .upsert(
      { ...syncPatch, ...(existing ? { id: existing.id } : {}) },
      { onConflict: 'provider_id' }
    )
    .select()
    .single();

  if (upsertError) {
    console.error('[sync-pms] Upsert error:', upsertError);
    return NextResponse.json({ error: 'Failed to save synced knowledge' }, { status: 500 });
  }

  return NextResponse.json({
    data: updated,
    synced_fields: ['property_description', 'location_details', 'room_types', 'amenities'],
  });
}
