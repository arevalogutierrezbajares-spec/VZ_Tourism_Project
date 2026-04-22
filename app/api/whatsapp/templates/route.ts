import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import { rateLimit } from '@/lib/api/rate-limit';

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(4096),
  shortcut: z.string().max(50).optional(),
});

const UpdateTemplateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4096).optional(),
  shortcut: z.string().max(50).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const DeleteTemplateSchema = z.object({
  id: z.string().uuid(),
});

// ─── GET /api/whatsapp/templates ────────────────────────────────────────────

export async function GET() {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const { data, error } = await supabase
    .from('quick_reply_templates')
    .select('id, provider_id, title, body, shortcut, sort_order, created_at, updated_at')
    .eq('provider_id', providerId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[whatsapp/templates] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// ─── POST /api/whatsapp/templates ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const rateLimitRes = await rateLimit(`api:${providerId}`, 10);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateTemplateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('quick_reply_templates')
    .insert({
      provider_id: providerId,
      title: parsed.data.title,
      body: parsed.data.body,
      shortcut: parsed.data.shortcut ?? null,
    })
    .select('id, provider_id, title, body, shortcut, sort_order, created_at, updated_at')
    .single();

  if (error) {
    // Unique constraint on (provider_id, shortcut)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A template with that shortcut already exists' },
        { status: 409 },
      );
    }
    console.error('[whatsapp/templates] POST error:', error.message);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ─── PATCH /api/whatsapp/templates ──────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const rateLimitRes = await rateLimit(`api:${providerId}`, 10);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateTemplateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...updates } = parsed.data;

  // Strip undefined values so we only send actual updates
  const cleanUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) cleanUpdates[key] = value;
  }

  if (Object.keys(cleanUpdates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Verify ownership: update only the row matching both id and provider_id
  const { data, error } = await supabase
    .from('quick_reply_templates')
    .update(cleanUpdates)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select('id, provider_id, title, body, shortcut, sort_order, created_at, updated_at')
    .single();

  if (error) {
    // No matching row = not found or not owned
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A template with that shortcut already exists' },
        { status: 409 },
      );
    }
    console.error('[whatsapp/templates] PATCH error:', error.message);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── DELETE /api/whatsapp/templates ─────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const rateLimitRes = await rateLimit(`api:${providerId}`, 10);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = DeleteTemplateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify ownership: delete only the row matching both id and provider_id
  const { error, count } = await supabase
    .from('quick_reply_templates')
    .delete({ count: 'exact' })
    .eq('id', parsed.data.id)
    .eq('provider_id', providerId);

  if (error) {
    console.error('[whatsapp/templates] DELETE error:', error.message);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
