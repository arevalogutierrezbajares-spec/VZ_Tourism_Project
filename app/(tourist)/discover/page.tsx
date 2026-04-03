import { DiscoverGrid } from './DiscoverGrid';
import { getAllContent } from '@/lib/discover-store';
import type { DiscoverItem } from './types';

export { type DiscoverItem } from './types';

export const metadata = {
  title: 'Discover Venezuela — Visual Journey',
  description: 'Let the beauty of Venezuela inspire your next adventure. Explore stunning photos of Los Roques, Angel Falls, Mérida, and beyond.',
};

export const dynamic = 'force-dynamic';

export default function DiscoverPage() {
  const content = getAllContent({ status: 'published' });
  // Also include featured items
  const featured = getAllContent({ status: 'featured' });
  const all = [...featured, ...content.filter((i) => !featured.some((f) => f.id === i.id))];
  return <DiscoverGrid items={all as unknown as DiscoverItem[]} />;
}
