import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
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
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
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
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop',
  },
  {
    value: 'eco-tours',
    label: 'Eco-Tours',
    description: 'Nature, wildlife, and sustainable tourism',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop',
  },
  {
    value: 'gastronomy',
    label: 'Gastronomy',
    description: 'Venezuelan cuisine and food tours',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
  },
  {
    value: 'adventure',
    label: 'Adventure',
    description: 'Extreme sports and adrenaline',
    image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=600&h=400&fit=crop',
  },
  {
    value: 'wellness',
    label: 'Wellness',
    description: 'Spa, yoga, and relaxation',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=600&h=400&fit=crop',
  },
  {
    value: 'cultural',
    label: 'Cultural Heritage',
    description: 'History, art, and indigenous cultures',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=400&fit=crop',
  },
];

const DESTINATION_CARDS = [
  {
    id: 'los-roques',
    name: 'Los Roques',
    tagline: 'Pristine Caribbean archipelago',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=300&fit=crop',
  },
  {
    id: 'merida',
    name: 'Mérida',
    tagline: 'Andean city with dramatic peaks',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=300&fit=crop',
  },
  {
    id: 'margarita',
    name: 'Margarita Island',
    tagline: 'Pearl of the Caribbean',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=300&fit=crop',
  },
  {
    id: 'canaima',
    name: 'Canaima',
    tagline: 'Home to Angel Falls',
    image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=300&fit=crop',
  },
  {
    id: 'choroni',
    name: 'Choroní',
    tagline: 'Colonial village meets tropical coast',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=300&fit=crop',
  },
  {
    id: 'morrocoy',
    name: 'Morrocoy',
    tagline: 'Caribbean cays and mangroves',
    image: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&h=300&fit=crop',
  },
  {
    id: 'caracas',
    name: 'Caracas',
    tagline: 'Vibrant capital city',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=300&fit=crop',
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
      <div className="relative h-[320px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=600&fit=crop"
          alt="Venezuela"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Discover Venezuela</h1>
          <p className="text-xl text-white/80 max-w-2xl">
            From pristine Caribbean beaches to Andean peaks — find your perfect Venezuelan adventure
          </p>
        </div>
      </div>

      <div className="container px-4 space-y-12 pb-12">
        {/* Categories */}
        <section>
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
