import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getListingBySlug } from '@/lib/local-listings';
import { getSession, updateSession } from '@/lib/onboarding-store';

interface Params {
  params: Promise<{ slug: string }>;
}

const verifySchema = z.object({
  method: z.enum(['phone', 'instagram', 'photo']),
  value: z.string().min(1).max(200),
  owner_name: z.string().min(1).max(200).optional(),
});

type ScrapedListingWithPhotos = ReturnType<typeof getListingBySlug> & { photos?: string[] };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const listing = getListingBySlug(slug) as ScrapedListingWithPhotos;
  if (!listing) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const session = getSession(slug);
  if (!session || session.status !== 'in_progress') {
    return NextResponse.json({ error: 'No active session' }, { status: 400 });
  }

  const parseResult = verifySchema.safeParse(await req.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { method, value, owner_name } = parseResult.data;

  if (method === 'phone') {
    // Normalize phone: strip non-digits and compare last 10 digits for Venezuela numbers
    const normalize = (p: string) => p.replace(/\D/g, '').slice(-10);
    const storedPhone = listing.phone ?? '';
    const matches = normalize(storedPhone) === normalize(value);

    if (matches) {
      updateSession(slug, {
        verified_via: 'phone',
        owner_phone: value,
        owner_name,
        verification_status: 'verified',
        step: Math.max(session.step, 2),
      });
      return NextResponse.json({ verified: true, method: 'phone' });
    }

    // Phone didn't match — allow proceeding as manual review
    updateSession(slug, {
      owner_phone: value,
      owner_name,
      verification_status: 'manual_review',
      step: Math.max(session.step, 2),
    });
    return NextResponse.json({ verified: false, manual_review: true });
  }

  if (method === 'instagram') {
    const normalize = (h: string) => h.replace(/^@/, '').toLowerCase().trim();
    const storedIG = listing.instagram_handle ?? '';
    const matches = storedIG && normalize(storedIG) === normalize(value);

    if (matches) {
      updateSession(slug, {
        verified_via: 'instagram',
        owner_instagram: value,
        owner_name,
        verification_status: 'verified',
        step: Math.max(session.step, 2),
      });
      return NextResponse.json({ verified: true, method: 'instagram' });
    }

    updateSession(slug, {
      owner_instagram: value,
      owner_name,
      verification_status: 'manual_review',
      step: Math.max(session.step, 2),
    });
    return NextResponse.json({ verified: false, manual_review: true });
  }

  if (method === 'photo') {
    // Photo upload path — always goes to manual review
    updateSession(slug, {
      verified_via: 'photo',
      owner_name,
      verification_status: 'manual_review',
      step: Math.max(session.step, 2),
    });
    return NextResponse.json({ verified: false, manual_review: true, message: 'Photo submitted for review. You can continue setting up your listing.' });
  }

  return NextResponse.json({ error: 'Unknown verification method' }, { status: 400 });
}
