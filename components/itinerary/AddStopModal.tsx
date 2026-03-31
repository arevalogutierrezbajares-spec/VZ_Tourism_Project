'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/listing/ListingCard';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Listing } from '@/types/database';
import { useDebounce } from '@/hooks/use-debounce';
import { useEffect } from 'react';

interface AddStopModalProps {
  isOpen: boolean;
  day: number;
  onClose: () => void;
}

export function AddStopModal({ isOpen, day, onClose }: AddStopModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const { addStop } = useItineraryStore();

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    async function search() {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/listings?query=${encodeURIComponent(debouncedQuery)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.data || []);
        }
      } finally {
        setIsSearching(false);
      }
    }

    search();
  }, [debouncedQuery]);

  const handleAddListing = (listing: Listing) => {
    const currentStops = useItineraryStore.getState().days.find((d) => d.day === day)?.stops || [];
    addStop({
      itinerary_id: useItineraryStore.getState().current?.id || '',
      listing_id: listing.id,
      day,
      order: currentStops.length,
      title: listing.title,
      description: listing.short_description ?? null,
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      location_name: listing.location_name ?? null,
      cost_usd: listing.price_usd,
      duration_hours: listing.duration_hours ?? null,
      start_time: null,
      end_time: null,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Stop - Day {day}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search experiences..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isSearching && (
            <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>
          )}
          {!isSearching && results.length === 0 && query && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          )}
          {!query && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Search for an experience to add to your itinerary
            </p>
          )}
          {results.map((listing) => (
            <div
              key={listing.id}
              className="cursor-pointer hover:bg-muted/50 rounded-xl transition-colors"
              onClick={() => handleAddListing(listing)}
            >
              <ListingCard listing={listing} compact />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
