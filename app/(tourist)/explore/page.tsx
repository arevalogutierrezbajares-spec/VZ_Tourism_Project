import type { Metadata } from 'next';
import { getTotalCount } from '@/lib/local-listings';
import { ExploreClient } from './ExploreClient';

export const metadata: Metadata = {
  title: 'Browse All | VZ Explorer',
  description: 'Browse all hotels, restaurants, and experiences across Venezuela',
};

export default function ExplorePage() {
  const count = getTotalCount();

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse All</h1>
        <p className="text-muted-foreground mt-2">
          {count.toLocaleString()} places to discover across Venezuela
        </p>
      </div>

      <ExploreClient total={count} />
    </div>
  );
}
