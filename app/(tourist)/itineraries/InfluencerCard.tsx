'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import type { Itinerary } from '@/types/database';
import { formatCurrency, getInitials } from '@/lib/utils';

interface CreatorProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  instagram_handle: string | null;
  followers: number;
  is_verified: boolean;
}

interface InfluencerCardProps {
  creator: CreatorProfile;
  itinerary: Itinerary;
  className?: string;
}

export function InfluencerCard({ creator, itinerary, className }: InfluencerCardProps) {
  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow rounded-2xl ${className || ''}`}>
      <CardContent className="p-5 space-y-4">
        {/* Creator header */}
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={creator.avatar_url || undefined} alt={`${creator.username}'s avatar`} />
            <AvatarFallback>{getInitials(creator.username)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">@{creator.username}</span>
              {creator.is_verified && (
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" aria-label="Verified creator" />
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">Creator</Badge>
            </div>
            {creator.instagram_handle && (
              <p className="text-xs text-muted-foreground truncate">
                {creator.instagram_handle}
              </p>
            )}
            <p className="text-xs text-primary font-semibold">
              {creator.followers.toLocaleString()} followers
            </p>
          </div>
        </div>

        {/* Featured itinerary mini-card */}
        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
          <h4 className="font-semibold text-sm line-clamp-1">{itinerary.title}</h4>
          <p className="text-xs text-muted-foreground">
            {itinerary.regions.join(' → ')}
            {itinerary.estimated_cost_usd > 0 && (
              <> · {formatCurrency(itinerary.estimated_cost_usd)}/person</>
            )}
          </p>
          {(itinerary.saves + itinerary.likes) > 0 && (
            <p className="text-xs text-primary font-semibold">
              {(itinerary.saves + itinerary.likes).toLocaleString()} recommend
            </p>
          )}
          {itinerary.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {itinerary.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/creator/${creator.username}`}>View Profile</Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/itinerary/${itinerary.id}`}>Book This Trip</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
