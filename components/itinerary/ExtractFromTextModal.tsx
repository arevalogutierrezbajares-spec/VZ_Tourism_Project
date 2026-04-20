'use client';

import { useState, useRef } from 'react';
import { FileText, Loader2, Sparkles, Plus, Upload } from 'lucide-react';
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

interface ExtractedDay {
  day: number;
  title: string;
  spots: (SpotState & { latitude: number | null; longitude: number | null })[];
}

type Step = 'input' | 'extracting' | 'review';

interface ExtractFromTextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExtractFromTextModal({ isOpen, onClose }: ExtractFromTextModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [days, setDays] = useState<ExtractedDay[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addStop, addDay, current } = useItineraryStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { toast.error('File too large (max 1MB)'); return; }
    setText(await file.text());
    toast.success(`Loaded "${file.name}"`);
  };

  const handleExtract = async () => {
    if (!text.trim()) { toast.error('Paste your trip notes or upload a file'); return; }

    setStep('extracting');
    setIsExtracting(true);

    try {
      const response = await fetch('/api/itineraries/extract-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Extraction failed');
      const data = await response.json();

      if (!data.days?.length) {
        toast('No places found in your notes. Try adding more details.');
        setStep('input');
        return;
      }

      const enrichedDays: ExtractedDay[] = data.days.map(
        (d: { day: number; title: string; spots: { extracted_name: string; matched_listing_id: string | null; matched_listing_title: string | null; confidence: 'high' | 'medium' | 'low'; region: string | null; description: string | null; latitude: number | null; longitude: number | null }[] }) => ({
          ...d,
          spots: d.spots.map((s) => ({
            ...s,
            included: true,
            resolved_listing_id: s.matched_listing_id,
            resolved_title: s.matched_listing_title,
            resolving: false,
            showGoogleSearch: false,
          })),
        })
      );

      setDays(enrichedDays);
      setStep('review');
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Failed to extract places');
      setStep('input');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateSpot = (dayIdx: number, spotIdx: number, patch: Partial<SpotState>) => {
    setDays((prev) =>
      prev.map((d, di) =>
        di === dayIdx
          ? { ...d, spots: d.spots.map((s, si) => (si === spotIdx ? { ...s, ...patch } : s)) }
          : d
      )
    );
  };

  const resolveFromGoogle = async (dayIdx: number, spotIdx: number, placeId: string) => {
    updateSpot(dayIdx, spotIdx, { resolving: true });
    try {
      const response = await fetch('/api/places/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_place_id: placeId }),
      });
      if (!response.ok) throw new Error('Failed');
      const { listing, created } = await response.json();
      updateSpot(dayIdx, spotIdx, {
        resolved_listing_id: listing.id,
        resolved_title: listing.title,
        confidence: 'high',
        resolving: false,
        showGoogleSearch: false,
      });
      // Also update lat/lng on the day state directly
      setDays((prev) =>
        prev.map((d, di) =>
          di === dayIdx
            ? { ...d, spots: d.spots.map((s, si) => si === spotIdx ? { ...s, latitude: listing.latitude, longitude: listing.longitude } : s) }
            : d
        )
      );
      if (created) toast.success(`"${listing.title}" added to database`);
    } catch {
      toast.error('Failed to resolve place');
      updateSpot(dayIdx, spotIdx, { resolving: false });
    }
  };

  const handleConfirmAll = () => {
    const allIncluded = days.flatMap((d) =>
      d.spots.filter((s) => s.included).map((s) => ({ ...s, day: d.day }))
    );
    if (allIncluded.length === 0) { toast.error('Select at least one spot'); return; }

    const currentDays = useItineraryStore.getState().days;
    const maxDay = Math.max(...days.map((d) => d.day), currentDays.length);
    for (let i = currentDays.length; i < maxDay; i++) addDay();

    for (const spot of allIncluded) {
      const dayStops = useItineraryStore.getState().days.find((d) => d.day === spot.day)?.stops || [];
      addStop({
        itinerary_id: current?.id || '',
        listing_id: spot.resolved_listing_id,
        day: spot.day,
        order: dayStops.length,
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
        source_type: 'document_import',
      });
    }

    toast.success(`Added ${allIncluded.length} spots to your itinerary`);
    handleReset();
    onClose();
  };

  const handleReset = () => { setStep('input'); setText(''); setDays([]); };

  const totalSpots = days.reduce((sum, d) => sum + d.spots.length, 0);
  const includedCount = days.reduce((sum, d) => sum + d.spots.filter((s) => s.included).length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-balance">
            <FileText className="w-4 h-4 text-primary" />
            Import Trip Notes
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Paste your trip notes, itinerary draft, or upload a text file.
            We&apos;ll extract the places and match them.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[160px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
              placeholder={`Paste your trip notes here...\n\nExample:\nDay 1 - Fly into Caracas, check into hotel.\nDay 2 - Drive to Choroní, lunch at the plaza, beach at Playa Grande.\nDay 3 - Cacao farm tour, Henri Pittier hike.`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload file
              </Button>
              <span className="text-xs text-muted-foreground">.txt, .md, .csv</span>
            </div>
          </div>
        )}

        {step === 'extracting' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Reading your notes...</p>
              <p className="text-xs text-muted-foreground mt-1 text-pretty">Extracting places and matching against our database</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            <p className="text-xs text-muted-foreground tabular-nums">
              Found {totalSpots} spot{totalSpots !== 1 ? 's' : ''} across {days.length} day{days.length !== 1 ? 's' : ''}:
            </p>
            {days.map((day, dayIdx) => (
              <div key={dayIdx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                    {day.day}
                  </div>
                  <h4 className="text-xs font-semibold">{day.title}</h4>
                </div>
                <div className="ml-2.5 border-l-2 border-muted pl-3 space-y-2">
                  {day.spots.map((spot, spotIdx) => (
                    <SpotReviewCard
                      key={spotIdx}
                      spot={spot}
                      compact
                      onToggle={() => updateSpot(dayIdx, spotIdx, { included: !spot.included })}
                      onToggleGoogleSearch={() => updateSpot(dayIdx, spotIdx, { showGoogleSearch: !spot.showGoogleSearch })}
                      onResolveFromGoogle={(placeId) => resolveFromGoogle(dayIdx, spotIdx, placeId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'input' && (
          <DialogFooter>
            <Button onClick={handleExtract} disabled={!text.trim() || isExtracting} className="w-full sm:w-auto">
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
            <Button onClick={handleConfirmAll} disabled={includedCount === 0} className="active:scale-[0.96] transition-[transform,background-color]">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span className="tabular-nums">Add {includedCount} Spots</span>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
