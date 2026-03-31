'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MapPin } from '@/types/map';
import { formatCurrency } from '@/lib/utils';

interface PinPreviewCardProps {
  pin: MapPin;
  onClose: () => void;
}

export function PinPreviewCard({ pin, onClose }: PinPreviewCardProps) {
  return (
    <Card className="w-72 shadow-xl border-0 overflow-hidden">
      {pin.imageUrl && (
        <div className="relative h-32">
          <Image src={pin.imageUrl} alt={pin.title} fill className="object-cover" />
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
        {pin.listingId && (
          <Link href={`/listing/${pin.listingId}`} className="inline-flex items-center justify-center w-full mt-2 h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            View details
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
