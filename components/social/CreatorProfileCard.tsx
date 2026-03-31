'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import type { CreatorProfile } from '@/types/database';
import { pluralize } from '@/lib/utils';

interface CreatorProfileCardProps {
  creator: CreatorProfile;
  compact?: boolean;
}

export function CreatorProfileCard({ creator, compact = false }: CreatorProfileCardProps) {
  if (compact) {
    return (
      <Link href={`/creator/${creator.username}`}>
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
          <Avatar className="w-10 h-10">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback>{creator.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm">@{creator.username}</p>
              {creator.is_verified && <Badge variant="secondary" className="text-xs px-1 py-0">✓</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {pluralize(creator.followers, 'follower')} · {pluralize(creator.total_itineraries, 'itinerary', 'itineraries')}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      {creator.cover_image_url && (
        <div className="relative h-32 rounded-xl overflow-hidden">
          <Image src={creator.cover_image_url} alt={creator.username} fill className="object-cover" />
        </div>
      )}
      <div className="flex items-end gap-4 px-2 -mt-8">
        <Avatar className="w-16 h-16 border-4 border-background shadow">
          <AvatarImage src={creator.avatar_url || undefined} />
          <AvatarFallback className="text-xl">{creator.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 pb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">@{creator.username}</h3>
            {creator.is_verified && (
              <Badge variant="secondary" className="text-xs">Verified</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{pluralize(creator.followers, 'follower')}</span>
            <span>{pluralize(creator.total_itineraries, 'itinerary', 'itineraries')}</span>
          </div>
        </div>
        {creator.instagram_handle && (
          <a
            href={`https://instagram.com/${creator.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Follow
          </a>
        )}
      </div>
      {creator.bio && (
        <p className="text-sm text-muted-foreground px-2">{creator.bio}</p>
      )}
    </div>
  );
}
