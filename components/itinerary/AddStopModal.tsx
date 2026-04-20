'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Plus, Star, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/listing/ListingCard';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Listing } from '@/types/database';
import { useDebounce } from '@/hooks/use-debounce';
import toast from 'react-hot-toast';

interface PlaceSuggestion {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
}

interface AddStopModalProps {
  isOpen: boolean;
  day: number;
  onClose: () => void;
}

export function AddStopModal({ isOpen, day, onClose }: AddStopModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showGooglePlaces, setShowGooglePlaces] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);
  const { addStop } = useItineraryStore();

  // Search internal DB
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setShowGooglePlaces(false);
      return;
    }

    async function search() {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/listings?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          const items = data.data || [];
          setResults(items);
          // Auto-show Google Places if no DB results
          setShowGooglePlaces(items.length === 0);
        }
      } finally {
        setIsSearching(false);
      }
    }

    search();
  }, [debouncedQuery]);

  // Search Google Places when shown
  useEffect(() => {
    if (!showGooglePlaces || !debouncedQuery.trim()) {
      setPlaceSuggestions([]);
      return;
    }

    async function searchPlaces() {
      setIsSearchingPlaces(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setPlaceSuggestions(data.suggestions || []);
        }
      } finally {
        setIsSearchingPlaces(false);
      }
    }

    searchPlaces();
  }, [showGooglePlaces, debouncedQuery]);

  const handleAddListing = (listing: Listing) => {
    const currentStops =
      useItineraryStore.getState().days.find((d) => d.day === day)?.stops || [];
    addStop({
      itinerary_id: useItineraryStore.getState().current?.id || '',
      listing_id: listing.id,
      day,
      order: currentStops.length,
      title: listing.title,
      description: listing.short_description ?? listing.description ?? null,
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      location_name: listing.location_name ?? null,
      cost_usd: listing.price_usd ?? 0,
      duration_hours: listing.duration_hours ?? null,
      start_time: null,
      end_time: null,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
      source_url: null,
      source_type: 'manual',
      video_embed_url: null,
    });
    onClose();
  };

  const handleSelectPlace = async (place: PlaceSuggestion) => {
    setResolvingPlaceId(place.place_id);
    try {
      const response = await fetch('/api/places/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_place_id: place.place_id }),
      });

      if (!response.ok) throw new Error('Failed to resolve place');

      const { listing, created } = await response.json();

      if (created) {
        // Brief visual confirmation that the spot was added to DB
        console.info(`New spot added to database: ${listing.title}`);
      }

      const currentStops =
        useItineraryStore.getState().days.find((d) => d.day === day)?.stops ||
        [];
      addStop({
        itinerary_id: useItineraryStore.getState().current?.id || '',
        listing_id: listing.id,
        day,
        order: currentStops.length,
        title: listing.title,
        description: listing.description || null,
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        location_name: listing.location_name ?? listing.title,
        cost_usd: listing.price_usd ?? 0,
        duration_hours: listing.duration_hours ?? null,
        start_time: null,
        end_time: null,
        transport_to_next: null,
        transport_duration_minutes: null,
        notes: created
          ? 'Added from Google Places — details may be updated'
          : null,
        source_url: listing.google_maps_uri || null,
        source_type: 'google_places',
        video_embed_url: null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to resolve Google Place:', error);
      toast.error('Failed to add this place. Please try again.');
    } finally {
      setResolvingPlaceId(null);
    }
  };

  const handleReset = () => {
    setQuery('');
    setResults([]);
    setPlaceSuggestions([]);
    setShowGooglePlaces(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleReset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Stop — Day {day}</DialogTitle>
          <DialogDescription>
            Search for experiences or places to add to your itinerary.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search experiences or places..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {/* Loading state */}
          {isSearching && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {/* Empty state */}
          {!query && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Search for an experience to add to your itinerary
            </p>
          )}

          {/* Internal DB results */}
          {results.length > 0 && (
            <>
              {results.map((listing) => (
                <div
                  key={listing.id}
                  className="cursor-pointer hover:bg-muted/50 rounded-xl transition-colors"
                  onClick={() => handleAddListing(listing)}
                >
                  <ListingCard listing={listing} compact />
                </div>
              ))}

              {/* Option to also search Google Places */}
              {!showGooglePlaces && (
                <button
                  type="button"
                  onClick={() => setShowGooglePlaces(true)}
                  className="w-full flex items-center gap-2 p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  Can&apos;t find it? Search Google Places
                </button>
              )}
            </>
          )}

          {/* No DB results — show Google Places automatically */}
          {!isSearching && results.length === 0 && query && !showGooglePlaces && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                No results for &quot;{query}&quot; in our database
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGooglePlaces(true)}
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                Search Google Places
              </Button>
            </div>
          )}

          {/* Google Places results */}
          {showGooglePlaces && query && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Google Places
                </span>
              </div>

              {isSearchingPlaces && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Searching Google Places...
                </div>
              )}

              {!isSearchingPlaces && placeSuggestions.length === 0 && (
                <p className="text-center py-4 text-sm text-muted-foreground">
                  No Google Places results for &quot;{query}&quot;
                </p>
              )}

              {placeSuggestions.map((place) => (
                <button
                  key={place.place_id}
                  type="button"
                  disabled={resolvingPlaceId === place.place_id}
                  onClick={() => handleSelectPlace(place)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    {resolvingPlaceId === place.place_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{place.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {place.formatted_address}
                    </p>
                    {resolvingPlaceId === place.place_id && (
                      <p className="text-xs text-primary mt-1">
                        Adding to database...
                      </p>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}

              {placeSuggestions.length > 0 && (
                <p className="text-[11px] text-muted-foreground/60 px-1 pt-1">
                  Selecting a place will add it to our database for future travelers
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
