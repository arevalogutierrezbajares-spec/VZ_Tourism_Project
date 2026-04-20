import { NextResponse } from 'next/server';
import { exportCSV } from '@/lib/admin-store';
import { requireAdmin } from '@/lib/api/require-auth';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const csv = exportCSV();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vz-listings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
