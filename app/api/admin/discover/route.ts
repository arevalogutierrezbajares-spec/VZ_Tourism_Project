import { NextRequest, NextResponse } from 'next/server';
import {
  getAllContent,
  createContent,
  updateContent,
  deleteContent,
} from '@/lib/discover-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const items = getAllContent({
    status: searchParams.get('status') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  });
  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const item = createContent(data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const item = updateContent(id, updates);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const ok = deleteContent(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
