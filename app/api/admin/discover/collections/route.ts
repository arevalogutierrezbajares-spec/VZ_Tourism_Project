import { NextRequest, NextResponse } from 'next/server';
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from '@/lib/discover-store';
import { requireAdmin } from '@/lib/api/require-auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const collections = getCollections();
  return NextResponse.json({ collections });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const data = await request.json();
    const collection = createCollection(data);
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const data = await request.json();
    const { id, ...updates } = data;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const collection = updateCollection(id, updates);
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ collection });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const ok = deleteCollection(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
