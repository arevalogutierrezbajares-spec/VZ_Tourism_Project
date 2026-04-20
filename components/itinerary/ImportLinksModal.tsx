'use client';

import { useState } from 'react';
import { Link2, Loader2, Sparkles, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SpotReviewCard, type SpotState } from './SpotReviewCard';
import { useItineraryStore } from '@/stores/itinerary-store';
import toast from 'react-hot-toast';

interface ExtractedSpot {
  extracted_name: string;
  matched_listing_id: string | null;
  matched_listing_title: string | null;
  confidence: 'high' | 'medium' | 'low';
  region: string | null;
  day_hint: number | null;
  order_hint: number | null;
  source_url: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  video_embed_url: string | null;
  thumbnail_url: string | null;
}

type Step = 'input' | 'extracting' | 'review';

interface ImportSpotState extends SpotState {
  day_hint: number | null;
  order_hint: number | null;
  source_url: string;
  video_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ImportLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportLinksModal({ isOpen, onClose }: ImportLinksModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [urlText, setUrlText] = useState('');
  const [spots, setSpots] = useState<ImportSpotState[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const { addStop, addDay, current, days } = useItineraryStore();

  const handleExtract = async () => {
    const urls = urlText
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    if (urls.length === 0) {
      toast.error('Paste at least one URL');
      return;
    }

    setStep('extracting');
    setIsExtracting(true);

    try {
      const response = await fetch('/api/itineraries/extract-from-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) throw new Error('Extraction failed');
      const data = await response.json();

      if (!data.spots?.length) {
        toast('No places found in those videos. Try different links.');
        setStep('input');
        return;
      }

      setSpots(
        data.spots.map((s: ExtractedSpot) => ({
          ...s,
          included: true,
          resolved_listing_id: s.matched_listing_id,
          resolved_title: s.matched_listing_title,
          resolving: false,
          showGoogleSearch: false,
        }))
      );
      setStep('review');
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Failed to extract places from links');
      setStep('input');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateSpot = (idx: number, patch: Partial<ImportSpotState>) => {
    setSpots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleResolveFromGoogle = async (idx: number, placeId: string) => {
    updateSpot(idx, { resolving: true });
    try {
      const response = await fetch('/api/places/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_place_id: placeId }),
      });
      if (!response.ok) throw new Error('Failed');
      const { listing, created } = await response.json();
      updateSpot(idx, {
        resolved_listing_id: listing.id,
        resolved_title: listing.title,
        latitude: listing.latitude,
        longitude: listing.longitude,
        confidence: 'high',
        resolving: false,
        showGoogleSearch: false,
      });
      if (created) toast.success(`"${listing.title}" added to database`);
    } catch {
      toast.error('Failed to resolve place');
      updateSpot(idx, { resolving: false });
    }
  };

  const handleConfirmAll = () => {
    const included = spots.filter((s) => s.included);
    if (included.length === 0) {
      toast.error('Select at least one spot');
      return;
    }

    const maxDay = Math.max(...included.map((s) => s.day_hint || 1), days.length);
    for (let i = days.length; i < maxDay; i++) addDay();

    for (const spot of included) {
      const day = spot.day_hint || 1;
      const currentDayStops =
        useItineraryStore.getState().days.find((d) => d.day === day)?.stops || [];

      addStop({
        itinerary_id: current?.id || '',
        listing_id: spot.resolved_listing_id,
        day,
        order: spot.order_hint ?? currentDayStops.length,
        title: spot.resolved_title || spot.extracted_name,
        description: spot.description || null,
        latitude: spot.latitude ?? null,
        longitude: spot.longitude ?? null,
        location_name: spot.resolved_title || spot.extracted_name,
        cost_usd: 0,
        duration_hours: null,
        start_time: null,
        end_time: null,
        transport_to_next: null,
        transport_duration_minutes: null,
        notes: null,
        source_url: spot.source_url,
        source_type: 'social_import',
        video_embed_url: spot.video_embed_url,
      });
    }

    toast.success(`Added ${included.length} spots to your itinerary`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStep('input');
    setUrlText('');
    setSpots([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Import from Social Media
          </DialogTitle>
          <DialogDescription>
            Paste TikTok, YouTube, or Instagram Reels links and we&apos;ll extract the places mentioned.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
              placeholder={`Paste your links here (one per line):\n\nhttps://www.tiktok.com/@user/video/123...\nhttps://www.youtube.com/watch?v=abc...\nhttps://www.instagram.com/reel/xyz...`}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Supports YouTube, TikTok, and Instagram Reels. Up to 20 links.
            </p>
          </div>
        )}

        {step === 'extracting' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Analyzing your videos...</p>
              <p className="text-xs text-muted-foreground mt-1">Fetching metadata and identifying places mentioned</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            <p className="text-xs text-muted-foreground">
              Found {spots.length} spot{spots.length !== 1 ? 's' : ''}. Confirm which ones to add:
            </p>
            {spots.map((spot, idx) => (
              <SpotReviewCard
                key={idx}
                spot={spot}
                onToggle={() => updateSpot(idx, { included: !spot.included })}
                onToggleGoogleSearch={() => updateSpot(idx, { showGoogleSearch: !spot.showGoogleSearch })}
                onResolveFromGoogle={(placeId) => handleResolveFromGoogle(idx, placeId)}
              />
            ))}
          </div>
        )}

        {step === 'input' && (
          <DialogFooter>
            <Button onClick={handleExtract} disabled={!urlText.trim() || isExtracting} className="w-full sm:w-auto">
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Extract Places
                </>
              )}
            </Button>
          </DialogFooter>
        )}

        {step === 'review' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('input')}>Back</Button>
            <Button onClick={handleConfirmAll} disabled={spots.every((s) => !s.included)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add {spots.filter((s) => s.included).length} Spots
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
