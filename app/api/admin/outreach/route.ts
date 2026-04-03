import { NextRequest, NextResponse } from 'next/server';
import { query, createRecord, updateRecord, getStats } from '@/lib/outreach-store';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filters = {
    status: searchParams.get('status') ?? undefined,
    channel: searchParams.get('channel') ?? undefined,
    business_id: searchParams.get('business_id') ?? undefined,
    classification: searchParams.get('classification') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
  };

  const records = query(filters);
  const stats = getStats();
  return NextResponse.json({ records, stats, total: records.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    business_id,
    business_name,
    business_type,
    business_region,
    channel,
    message_text,
    sequence_step = 1,
    sequence_name = 'founding_partner_v1',
    notes = '',
  } = body;

  if (!business_id || !channel || !message_text) {
    return NextResponse.json({ error: 'business_id, channel, and message_text are required' }, { status: 400 });
  }

  const record = await createRecord({
    business_id,
    business_name: business_name ?? '',
    business_type: business_type ?? '',
    business_region: business_region ?? '',
    channel,
    status: 'queued',
    message_text,
    response_text: null,
    response_classification: null,
    sequence_step,
    sequence_name,
    sent_at: null,
    responded_at: null,
    notes,
  });

  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // If marking as sent, set sent_at
  if (fields.status === 'sent' && !fields.sent_at) {
    fields.sent_at = new Date().toISOString();
  }
  // If marking as responded, set responded_at
  if (fields.status === 'responded' && !fields.responded_at) {
    fields.responded_at = new Date().toISOString();
  }

  const updated = await updateRecord(id, fields);
  if (!updated) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  return NextResponse.json({ record: updated });
}
