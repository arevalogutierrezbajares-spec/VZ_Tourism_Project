import { NextRequest, NextResponse } from 'next/server';
import { loadAll, updateListing, deleteListing } from '@/lib/admin-store';
import { requireAdmin } from '@/lib/api/require-auth';

const CATEGORY_TYPES: Record<string, string[]> = {
  hotels: ['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'],
  restaurants: ['restaurante', 'restaurant', 'cafe', 'bar'],
  experiences: ['tours', 'tour', 'experience', 'agencia', 'transfer'],
};

function mapTypeToCategory(type: string): string {
  const t = (type || '').toLowerCase();
  if (CATEGORY_TYPES.hotels.includes(t)) return 'hotels';
  if (CATEGORY_TYPES.restaurants.includes(t)) return 'restaurants';
  if (CATEGORY_TYPES.experiences.includes(t)) return 'experiences';
  return 'other';
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const region = searchParams.get('region') || 'all';
  const status = searchParams.get('status') || 'all';
  const sortCol = searchParams.get('sort') || 'name';
  const sortDir = searchParams.get('dir') || 'asc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let listings = loadAll();

  // Filter
  if (search) {
    const q = search.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.region?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
    );
  }
  if (category !== 'all') {
    const types = CATEGORY_TYPES[category];
    if (types) {
      listings = listings.filter((l) => types.includes((l.type || '').toLowerCase()));
    } else if (category === 'other') {
      const allKnown = Object.values(CATEGORY_TYPES).flat();
      listings = listings.filter((l) => !allKnown.includes((l.type || '').toLowerCase()));
    }
  }
  if (region !== 'all') {
    listings = listings.filter((l) => l.region === region);
  }
  if (status !== 'all') {
    listings = listings.filter((l) => l.status === status);
  }

  // Sort
  listings = [...listings].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortCol] ?? '';
    const bVal = (b as unknown as Record<string, unknown>)[sortCol] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const total = listings.length;
  const offset = (page - 1) * limit;
  const paginated = listings.slice(offset, offset + limit);

  // Enrich with derived category
  const enriched = paginated.map((l) => ({ ...l, derivedCategory: mapTypeToCategory(l.type) }));

  return NextResponse.json({ listings: enriched, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await updateListing(id, fields);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ listing: updated });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = await deleteListing(id);
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
