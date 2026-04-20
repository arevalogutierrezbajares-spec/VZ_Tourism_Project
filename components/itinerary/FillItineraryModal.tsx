'use client';

import { useState } from 'react';
import { Sparkles, Loader2, MapPin, Calendar, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useItineraryStore } from '@/stores/itinerary-store';
import toast from 'react-hot-toast';

const REGIONS = [
  { value: 'los_roques', label: 'Los Roques' },
  { value: 'merida', label: 'Merida' },
  { value: 'margarita', label: 'Margarita' },
  { value: 'canaima', label: 'Canaima' },
  { value: 'gran_sabana', label: 'Gran Sabana' },
  { value: 'morrocoy', label: 'Morrocoy' },
  { value: 'caracas', label: 'Caracas' },
  { value: 'choroni', label: 'Choroni' },
];

const VIBES = [
  { value: 'adventure', label: 'Adventure', icon: '🏔' },
  { value: 'relaxation', label: 'Relaxation', icon: '🏖' },
  { value: 'cultural', label: 'Cultural', icon: '🎭' },
  { value: 'mixed', label: 'Mix of everything', icon: '✨' },
  { value: 'nature', label: 'Nature & Wildlife', icon: '🌿' },
  { value: 'gastronomy', label: 'Food & Drink', icon: '🍽' },
];

interface FillItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FillItineraryModal({ isOpen, onClose }: FillItineraryModalProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const { addDay, addStop, current } = useItineraryStore();

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const handleGenerate = async () => {
    if (selectedRegions.length === 0) {
      toast.error('Select at least one region');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/fill-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions: selectedRegions,
          total_days: days,
          vibe,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const { days: generatedDays } = await response.json();

      if (!generatedDays || generatedDays.length === 0) {
        toast.error('Could not generate itinerary. Try different options.');
        return;
      }

      // Populate the itinerary store
      const currentDays = useItineraryStore.getState().days;

      // Add days if we need more
      for (let i = currentDays.length; i < generatedDays.length; i++) {
        addDay();
      }

      // Add stops to each day
      for (const genDay of generatedDays) {
        for (let i = 0; i < genDay.stops.length; i++) {
          const stop = genDay.stops[i];
          addStop({
            itinerary_id: current?.id || '',
            listing_id: stop.listing_id || null,
            day: genDay.day,
            order: i,
            title: stop.title,
            description: stop.description || null,
            latitude: stop.latitude ?? null,
            longitude: stop.longitude ?? null,
            location_name: stop.location_name || null,
            cost_usd: stop.cost_usd || 0,
            duration_hours: stop.duration_hours ?? null,
            start_time: null,
            end_time: null,
            transport_to_next: null,
            transport_duration_minutes: null,
            notes: null,
            source_type: 'ai_suggested',
          });
        }
      }

      toast.success(`Generated ${generatedDays.length}-day itinerary!`);
      onClose();
    } catch (error) {
      console.error('Fill itinerary error:', error);
      toast.error('Failed to generate itinerary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-balance">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Itinerary Builder
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Tell us what you&apos;re looking for and we&apos;ll create a starting itinerary you can customize.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Regions */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Where do you want to go?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleRegion(r.value)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-[border-color,background-color,color] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none min-h-[32px] active:scale-[0.96] ${
                    selectedRegions.includes(r.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              How many days?
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
                className="w-20 tabular-nums"
              />
              <span className="text-sm text-muted-foreground tabular-nums">
                {days === 1 ? '1 day' : `${days} days`}
              </span>
            </div>
          </div>

          {/* Vibe */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              What&apos;s the vibe?
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {VIBES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVibe(v.value)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-[border-color,background-color,color] text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none min-h-[40px] active:scale-[0.96] ${
                    vibe === v.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span>{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center">
          AI-generated suggestions — verify details before booking
        </p>

        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedRegions.length === 0}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Generate Itinerary
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
