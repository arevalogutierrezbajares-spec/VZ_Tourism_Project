'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      <Link href={`/creator/${creator.username}`} className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-xl focus-visible:outline-none" aria-label={`View ${creator.username}'s profile`}>
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 active:scale-[0.96] transition-[background-color,transform] duration-200 cursor-pointer">
          <Avatar className="w-10 h-10 outline outline-1 -outline-offset-1 outline-black/10 rounded-full">
            <AvatarImage src={creator.avatar_url || undefined} alt={`${creator.username}'s avatar`} />
            <AvatarFallback>{(creator.username ?? '?')[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-medium text-sm">@{creator.username}</p>
              {creator.is_verified && <Badge variant="secondary" className="text-xs px-1 py-0">✓</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="tabular-nums">{pluralize(creator.followers, 'follower')}</span> · <span className="tabular-nums">{pluralize(creator.total_itineraries, 'itinerary', 'itineraries')}</span>
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
          <Image src={creator.cover_image_url} alt={`${creator.username}'s cover photo`} fill sizes="(max-width: 640px) 100vw, 500px" className="object-cover outline outline-1 -outline-offset-1 outline-black/10" />
        </div>
      )}
      <div className="flex items-end gap-4 px-2 -mt-8">
        <Avatar className="w-16 h-16 border-4 border-background shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] outline outline-1 -outline-offset-1 outline-black/10 rounded-full">
          <AvatarImage src={creator.avatar_url || undefined} alt={`${creator.username}'s avatar`} />
          <AvatarFallback className="text-xl">{(creator.username ?? '?')[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 pb-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-balance">@{creator.username}</h3>
            {creator.is_verified && (
              <Badge variant="secondary" className="text-xs">Verified</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="tabular-nums">{pluralize(creator.followers, 'follower')}</span>
            <span className="tabular-nums">{pluralize(creator.total_itineraries, 'itinerary', 'itineraries')}</span>
          </div>
        </div>
        {creator.instagram_handle && (
          <a
            href={`https://instagram.com/${creator.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-2 min-h-[44px] text-sm font-medium hover:bg-muted active:scale-[0.96] transition-[background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={`Follow ${creator.username} on Instagram`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Follow
          </a>
        )}
      </div>
      {creator.bio && (
        <p className="text-sm text-muted-foreground px-2 text-pretty">{creator.bio}</p>
      )}
    </div>
  );
}
