import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Fields managed by this endpoint (subset of the users table).
// Returns snake_case names that match the old user_profiles schema for
// backward compatibility with existing frontend consumers.
const PROFILE_SELECT =
  'id, full_name, phone, nationality, preferred_language, avatar_url, ' +
  'interests, emergency_contact_name, emergency_contact_phone, ' +
  'payment_zelle_email, payment_usdt_address, updated_at';

function toProfileResponse(row: Record<string, unknown>) {
  return {
    user_id:                row.id,
    display_name:           row.full_name,
    phone:                  row.phone,
    country:                row.nationality,
    language:               row.preferred_language,
    avatar_url:             row.avatar_url,
    interests:              row.interests ?? [],
    emergency_contact_name: row.emergency_contact_name,
    emergency_contact_phone: row.emergency_contact_phone,
    payment_zelle_email:    row.payment_zelle_email,
    payment_usdt_address:   row.payment_usdt_address,
    updated_at:             row.updated_at,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('users')
      .select(PROFILE_SELECT)
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data ? toProfileResponse(data) : null });
  } catch (err) {
    console.error('[GET /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      display_name, phone, country, language, interests,
      emergency_contact_name, emergency_contact_phone,
      payment_zelle_email, payment_usdt_address, avatar_url,
    } = body;

    // Build update payload — only include fields that were sent.
    const updates: Record<string, unknown> = {};
    if (display_name           !== undefined) updates.full_name           = display_name;
    if (phone                  !== undefined) updates.phone               = phone;
    if (country                !== undefined) updates.nationality          = country;
    if (language               !== undefined) updates.preferred_language   = language;
    if (interests              !== undefined) updates.interests            = interests;
    if (emergency_contact_name !== undefined) updates.emergency_contact_name  = emergency_contact_name;
    if (emergency_contact_phone!== undefined) updates.emergency_contact_phone = emergency_contact_phone;
    if (payment_zelle_email    !== undefined) updates.payment_zelle_email  = payment_zelle_email;
    if (payment_usdt_address   !== undefined) updates.payment_usdt_address = payment_usdt_address;
    if (avatar_url             !== undefined) updates.avatar_url           = avatar_url;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: toProfileResponse(data) });
  } catch (err) {
    console.error('[POST /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { POST as PUT };
