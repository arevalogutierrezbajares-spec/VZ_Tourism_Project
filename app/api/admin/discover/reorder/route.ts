import { NextRequest, NextResponse } from 'next/server';
import { reorderContent } from '@/lib/discover-store';
import { requireAdmin } from '@/lib/api/require-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
    }
    reorderContent(ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
