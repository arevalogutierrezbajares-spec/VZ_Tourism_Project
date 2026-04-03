import type { Metadata } from 'next';
import { getAllContent } from '@/lib/discover-store';
import { DiscoverManager } from '@/components/admin/DiscoverManager';

export const metadata: Metadata = { title: 'Admin: Discover Feed' };

export default function AdminDiscoverPage() {
  const initialItems = getAllContent();
  return <DiscoverManager initialItems={initialItems} />;
}
