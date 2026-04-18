import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { HeroSection } from '@/components/common/HeroSection';
import type { Listing } from '@/types/database';

export const metadata: Metadata = {
  title: 'Discover Venezuela',
  description: 'Browse all tourism experiences across Venezuela',
};

const CATEGORY_CARDS = [
  {
    value: 'beaches',
    label: 'Beaches & Islands',
    description: 'Sun, sand, and crystal clear waters',
    image: '/hero/beach.jpg',
  },
  {
    value: 'mountains',
    label: 'Mountains',
    description: 'Andes peaks and highland adventures',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop',
  },
  {
    value: 'cities',
    label: 'Cities',
    description: 'Urban culture and architecture',
    image: '/hero/city_skyline.jpg',
  },
  {
    value: 'eco-tours',
    label: 'Eco-Tours',
    description: 'Nature, wildlife, and sustainable tourism',
    image: '/hero/nature_tour.webp',
  },
  {
    value: 'gastronomy',
    label: 'Gastronomy',
    description: 'Venezuelan cuisine and food tours',
    image: '/hero/gastronomy.jpg',
  },
  {
    value: 'adventure',
    label: 'Adventure',
    description: 'Extreme sports and adrenaline',
    image: '/hero/adventure.jpg',
  },
  {
    value: 'wellness',
    label: 'Wellness',
    description: 'Spa, yoga, and relaxation',
    image: '/hero/vzla_retreat.avif',
  },
  {
    value: 'cultural',
    label: 'Cultural Heritage',
    description: 'History, art, and indigenous cultures',
    image: '/hero/Colonia_Tovar.jpg',
  },
];

const DESTINATION_CARDS = [
  {
    id: 'los-roques',
    name: 'Los Roques',
    tagline: 'Pristine Caribbean archipelago',
    image: '/destinations/los roques1.jpg',
  },
  {
    id: 'merida',
    name: 'Mérida',
    tagline: 'Andean city with dramatic peaks',
    image: '/destinations/merida.jpg',
  },
  {
    id: 'margarita',
    name: 'Margarita Island',
    tagline: 'Pearl of the Caribbean',
    image: '/destinations/margarita.jpeg',
  },
  {
    id: 'canaima',
    name: 'Canaima',
    tagline: 'Home to Angel Falls',
    image: '/destinations/angel-falls-tour.jpg',
  },
  {
    id: 'choroni',
    name: 'Choroní',
    tagline: 'Colonial village meets tropical coast',
    image: '/destinations/choroni.jpg',
  },
  {
    id: 'morrocoy',
    name: 'Morrocoy',
    tagline: 'Caribbean cays and mangroves',
    image: '/destinations/morrocoy.jpg',
  },
  {
    id: 'caracas',
    name: 'Caracas',
    tagline: 'Vibrant capital city',
    image: '/destinations/caracas1.jpg',
  },
  {
    id: 'maracaibo',
    name: 'Maracaibo',
    tagline: 'Gateway to Catatumbo lightning',
    image: '/destinations/maracaibo.jpg',
  },
];

export default async function LibraryPage() {
  let featuredListings = null;
  let recentListings = null;

  try {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: featured }, { data: recent }] = await Promise.all([
        supabase
          .from('listings')
          .select('*, provider:providers(business_name, is_verified, rating)')
          .eq('is_published', true)
          .eq('is_featured', true)
          .order('rating', { ascending: false })
          .limit(8),
        supabase
          .from('listings')
          .select('*, provider:providers(business_name, is_verified)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);
      featuredListings = featured;
      recentListings = recent;
    }
  } catch {
    // Supabase not configured, show page without DB data
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <HeroSection />

      <div className="container mx-auto px-4 space-y-12 pb-12">
        {/* Categories */}
        <section id="categories">
          <h2 className="text-2xl font-bold mb-6">Browse by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORY_CARDS.map((cat) => (
              <Link
                key={cat.value}
                href={`/library/category/${cat.value}`}
                className="group relative h-[200px] rounded-xl overflow-hidden"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-white font-bold text-lg leading-tight">{cat.label}</h3>
                  <p className="text-white/70 text-sm mt-0.5">{cat.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Destinations */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Explore by destination</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DESTINATION_CARDS.map((dest) => (
              <Link
                key={dest.id}
                href={`/library/region/${dest.id}`}
                className="group relative h-[140px] rounded-xl overflow-hidden"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <h3 className="text-white font-bold text-base leading-tight">{dest.name}</h3>
                  <p className="text-white/70 text-xs mt-0.5">{dest.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured */}
        {featuredListings && featuredListings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Featured experiences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing as Listing} />
              ))}
            </div>
          </section>
        )}

        {/* Recent */}
        {recentListings && recentListings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recently added</h2>
              <Link href="/library/category" className="text-sm text-primary hover:underline">
                See all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing as Listing} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
