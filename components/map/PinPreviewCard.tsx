'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, Star, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MapPin } from '@/types/map';
import { formatCurrency } from '@/lib/utils';
import { useItineraryStore } from '@/stores/itinerary-store';
import toast from 'react-hot-toast';

interface PinPreviewCardProps {
  pin: MapPin;
  onClose: () => void;
}

export function PinPreviewCard({ pin, onClose }: PinPreviewCardProps) {
  const { current, days, addStop, openPanel } = useItineraryStore();

  const handleAddToItinerary = () => {
    if (!current) {
      toast.error('Create an itinerary first using the "Plan itinerary" button');
      return;
    }
    const targetDay = days[0]?.day ?? 1;
    const existingStops = days.find((d) => d.day === targetDay)?.stops ?? [];
    addStop({
      itinerary_id: current.id,
      listing_id: pin.listingId ?? null,
      day: targetDay,
      order: existingStops.length,
      title: pin.title,
      description: null,
      latitude: pin.lat,
      longitude: pin.lng,
      location_name: pin.title,
      cost_usd: pin.price ?? 0,
      duration_hours: null,
      start_time: null,
      end_time: null,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
    });
    openPanel();
    toast.success(`Added "${pin.title}" to Day ${targetDay}`);
  };

  return (
    <Card className="w-72 shadow-xl border-0 overflow-hidden">
      {pin.imageUrl && (
        <div className="relative h-32">
          <Image src={pin.imageUrl} alt={pin.title} fill sizes="288px" className="object-cover" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 w-6 h-6 bg-black/30 text-white hover:bg-black/50"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      <CardContent className="p-3">
        {!pin.imageUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 w-6 h-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{pin.title}</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {pin.rating && (
                <>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{pin.rating.toFixed(1)}</span>
                </>
              )}
              {pin.category && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 capitalize ml-1">
                  {pin.category}
                </Badge>
              )}
            </div>
            {pin.price && (
              <span className="text-sm font-bold text-primary">
                {formatCurrency(pin.price, 'USD')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs gap-1"
            onClick={handleAddToItinerary}
          >
            <PlusCircle className="w-3 h-3" />
            Add to Itinerary
          </Button>
          {pin.listingId && (
            <Link
              href={`/listing/${pin.listingId}`}
              className="flex-1 inline-flex items-center justify-center h-7 rounded-[min(var(--radius-md),12px)] px-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              View details
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
