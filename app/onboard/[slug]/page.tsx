import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getListingBySlug } from '@/lib/local-listings';
import { getSession, getRegionalPriceSuggestion } from '@/lib/onboarding-store';
import { OnboardingWizard } from './OnboardingWizard';

interface Props {
  params: Promise<{ slug: string }>;
}

type ListingWithPhotos = ReturnType<typeof getListingBySlug> & { photos?: string[] };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) return { title: 'Set Up Your Listing' };
  const name = listing.name
    .split(' ')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    title: `Set Up ${name}`,
    description: 'Complete your listing setup and start receiving bookings on VZ Explorer.',
  };
}

export default async function OnboardPage({ params }: Props) {
  const { slug } = await params;
  const listing = getListingBySlug(slug) as ListingWithPhotos | undefined;
  if (!listing) notFound();

  const existingSession = getSession(slug);
  const priceSuggestion = getRegionalPriceSuggestion(listing.region);

  return (
    <OnboardingWizard
      listing={listing}
      initialSession={existingSession ?? null}
      priceSuggestion={priceSuggestion}
    />
  );
}
