import { NextRequest, NextResponse } from 'next/server';
import { getListingBySlug } from '@/lib/local-listings';
import {
  getSession,
  createSession,
  updateSession,
  completeOnboarding,
  getRegionalPriceSuggestion,
} from '@/lib/onboarding-store';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const listing = getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const session = getSession(slug);
  const priceSuggestion = getRegionalPriceSuggestion(listing.region);

  return NextResponse.json({
    listing,
    session: session ?? null,
    priceSuggestion,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const listing = getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { action, ...data } = body;

  if (action === 'start') {
    // Create or resume session
    let session = getSession(slug);
    if (!session || session.status !== 'in_progress') {
      session = createSession(slug, listing.id);
    }
    return NextResponse.json({ session });
  }

  if (action === 'save_step') {
    const session = updateSession(slug, data as Parameters<typeof updateSession>[1]);
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }
    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PUT(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const listing = getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const session = completeOnboarding(slug);
  if (!session) {
    return NextResponse.json({ error: 'No active session to complete' }, { status: 400 });
  }

  return NextResponse.json({ session, message: 'Onboarding complete! Your listing is now live.' });
}
