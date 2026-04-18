import type { Metadata } from 'next';
import Link from 'next/link';
import { getTotalCount } from '@/lib/local-listings';
import { ExploreClient } from './ExploreClient';

export const metadata: Metadata = {
  title: 'Browse All | VZ Explorer',
  description: 'Browse all hotels, restaurants, and experiences across Venezuela',
};

const CATEGORY_CARDS = [
  {
    id: 'hotel',
    label: 'Hotels & Stays',
    description: 'Posadas, hotels, and unique accommodations',
    image: '/hero/city_skyline.jpg',
    emoji: '🏨',
  },
  {
    id: 'restaurant',
    label: 'Gastronomy',
    description: 'Restaurants, cafés, and local cuisine',
    image: '/hero/gastronomy.jpg',
    emoji: '🍽️',
  },
  {
    id: 'experience',
    label: 'Experiences',
    description: 'Tours, adventures, and activities',
    image: '/hero/adventure.jpg',
    emoji: '🎒',
  },
];

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function ExplorePage({ searchParams }: Props) {
  const { category: initialCategory } = await searchParams;
  const count = getTotalCount();

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Venezuela</h1>
        <p className="text-muted-foreground mt-2">
          {count.toLocaleString()} places to discover
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {CATEGORY_CARDS.map((cat) => (
          <Link
            key={cat.id}
            href={`/explore?category=${cat.id}`}
            className="group relative h-[160px] rounded-2xl overflow-hidden"
          >
            <img
              src={cat.image}
              alt={cat.label}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5">
              <div className="text-2xl mb-1">{cat.emoji}</div>
              <h3 className="text-white font-bold text-lg leading-tight">{cat.label}</h3>
              <p className="text-white/70 text-sm mt-0.5">{cat.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Grid */}
      <ExploreClient total={count} initialCategory={initialCategory} />
    </div>
  );
}
