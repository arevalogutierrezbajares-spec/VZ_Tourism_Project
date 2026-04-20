'use client';

import { useState } from 'react';
import { Flame, Clock, UserCheck, Users, Map } from 'lucide-react';
import { ItineraryFeedCard } from '@/components/social/ItineraryFeedCard';
import { cn } from '@/lib/utils';
import type { Itinerary } from '@/types/database';

interface ExploreTabsProps {
  trending: Itinerary[];
  newest: Itinerary[];
}

const TABS = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'following', label: 'Following', icon: UserCheck },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ExploreTabs({ trending, newest }: ExploreTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trending');

  const getItems = (): Itinerary[] => {
    if (activeTab === 'trending') return trending;
    if (activeTab === 'new') return newest;
    return []; // Following requires auth + following logic
  };

  const items = getItems();

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 bg-muted/50 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((itinerary) => (
            <ItineraryFeedCard key={itinerary.id} itinerary={itinerary} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          {activeTab === 'following' ? (
            <>
              <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">Follow creators to see their itineraries</h3>
              <p className="text-muted-foreground mt-1">
                Explore the Trending tab to discover creators to follow.
              </p>
            </>
          ) : (
            <>
              <Map className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No public itineraries yet</h3>
              <p className="text-muted-foreground mt-1">
                Be the first to share your Venezuela adventure!
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
