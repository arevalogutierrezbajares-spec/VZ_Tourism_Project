'use client';

import { useState } from 'react';
import {
  MapPin,
  Check,
  AlertCircle,
  Search,
  Loader2,
  Plus,
  Play,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlaceSuggestion {
  place_id: string;
  name: string;
  formatted_address: string;
}

export interface SpotState {
  extracted_name: string;
  matched_listing_id: string | null;
  matched_listing_title: string | null;
  confidence: 'high' | 'medium' | 'low';
  region: string | null;
  description: string | null;
  // UI-managed state
  included: boolean;
  resolved_listing_id: string | null;
  resolved_title: string | null;
  resolving: boolean;
  showGoogleSearch: boolean;
  // Optional media (social import only)
  thumbnail_url?: string | null;
  source_url?: string | null;
}

const CONFIDENCE_COLOR = {
  high: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  low: 'text-red-600 bg-red-50 dark:bg-red-950/30',
};

interface SpotReviewCardProps {
  spot: SpotState;
  onToggle: () => void;
  onToggleGoogleSearch: () => void;
  onResolveFromGoogle: (placeId: string) => void;
  compact?: boolean;
}

export function SpotReviewCard({
  spot,
  onToggle,
  onToggleGoogleSearch,
  onResolveFromGoogle,
  compact = false,
}: SpotReviewCardProps) {
  const [googleQuery, setGoogleQuery] = useState(spot.extracted_name);
  const [googleResults, setGoogleResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!googleQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/places/autocomplete?q=${encodeURIComponent(googleQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setGoogleResults(data.suggestions || []);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const padding = compact ? 'p-2.5' : 'p-3';
  const roundedness = compact ? 'rounded-lg' : 'rounded-xl';

  return (
    <div
      className={`${roundedness} border ${padding} space-y-1.5 transition-opacity ${
        spot.included ? 'opacity-100' : 'opacity-40'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Thumbnail (social import only) */}
        {spot.thumbnail_url ? (
          <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spot.thumbnail_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        ) : !compact ? (
          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">{spot.extracted_name}</p>
          {spot.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {spot.description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {spot.region && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {spot.region.replace(/_/g, ' ')}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${CONFIDENCE_COLOR[spot.confidence]}`}
            >
              {spot.resolved_listing_id ? (
                <>
                  <Check className="w-2.5 h-2.5 mr-0.5" />
                  Matched
                </>
              ) : (
                <>
                  <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                  No match
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Toggle include */}
        <button
          type="button"
          onClick={onToggle}
          className={`w-${compact ? '5' : '6'} h-${compact ? '5' : '6'} rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            spot.included
              ? 'bg-primary border-primary text-white'
              : 'border-muted-foreground/30 text-transparent hover:border-muted-foreground/50'
          }`}
        >
          <Check className="w-3 h-3" />
        </button>
      </div>

      {/* Matched listing info */}
      {spot.resolved_listing_id && spot.resolved_title && (
        <div className="flex items-center gap-1.5 text-xs bg-muted/50 rounded-md px-2 py-1">
          <Check className="w-3 h-3 text-green-600 shrink-0" />
          <span className="truncate">{spot.resolved_title}</span>
        </div>
      )}

      {/* No match — Google Places search */}
      {!spot.resolved_listing_id && spot.included && (
        <>
          {!spot.showGoogleSearch ? (
            <button
              type="button"
              onClick={onToggleGoogleSearch}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Search className="w-3 h-3" />
              Search Google Places to confirm
            </button>
          ) : (
            <div className="space-y-1.5 bg-muted/30 rounded-md p-2">
              <div className="flex gap-1.5">
                <Input
                  className="h-7 text-xs"
                  value={googleQuery}
                  onChange={(e) => setGoogleQuery(e.target.value)}
                  placeholder="Search..."
                />
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </Button>
              </div>
              {googleResults.map((place) => (
                <button
                  key={place.place_id}
                  type="button"
                  disabled={spot.resolving}
                  onClick={() => onResolveFromGoogle(place.place_id)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-md text-left hover:bg-muted/50 transition-colors text-xs disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{place.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {place.formatted_address}
                    </p>
                  </div>
                  {spot.resolving ? (
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  ) : (
                    <Plus className="w-3 h-3 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
