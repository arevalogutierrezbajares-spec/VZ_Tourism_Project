'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface TrendingListing {
  id: string;
  title: string;
  slug: string;
  region: string;
  city: string | null;
  rating: number | null;
  cover_image_url: string | null;
}

export function TrendingSection() {
  const [listings, setListings] = useState<TrendingListing[]>([]);

  useEffect(() => {
    fetch('/api/listings?sort=rating&limit=6')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setListings(data);
        else if (Array.isArray(data?.data)) setListings(data.data);
        else if (Array.isArray(data?.listings)) setListings(data.listings);
      })
      .catch(() => {});
  }, []);

  if (listings.length === 0) return null;

  return (
    <section className="pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          Trending Now
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listing/${listing.slug}`}
              className="flex-shrink-0 w-[200px] rounded-xl overflow-hidden bg-background shadow-sm border hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <div className="relative h-[130px] bg-muted">
                {listing.cover_image_url && (
                  <Image
                    src={`/api/photos?url=${encodeURIComponent(listing.cover_image_url)}`}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-semibold leading-snug mb-1 line-clamp-2">
                  {listing.title}
                </p>
                <p className="text-xs text-muted-foreground mb-1.5">
                  {listing.city ?? listing.region}
                </p>
                {listing.rating != null && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-xs font-semibold">{listing.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
