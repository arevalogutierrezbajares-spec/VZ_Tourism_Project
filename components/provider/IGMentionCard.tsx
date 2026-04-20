'use client';

import Image from 'next/image';
import { Heart, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { IGMention } from '@/types/database';
import { formatRelativeDate, truncate } from '@/lib/utils';

interface IGMentionCardProps {
  mention: IGMention;
  onApprove?: (id: string) => void;
}

export function IGMentionCard({ mention, onApprove }: IGMentionCardProps) {
  return (
    <Card className="overflow-hidden">
      {mention.media_url && (
        <div className="relative aspect-square">
          <Image
            src={mention.media_url}
            alt={mention.caption || 'Instagram post'}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">@{mention.author_username}</p>
            {mention.author_name && (
              <p className="text-xs text-muted-foreground">{mention.author_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="w-3 h-3" />
            {mention.likes.toLocaleString()}
          </div>
        </div>

        {mention.caption && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {truncate(mention.caption, 120)}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(mention.created_at)}
          </span>
          <div className="flex gap-1.5">
            {!mention.is_approved && onApprove && (
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onApprove(mention.id)}>
                Approve
              </Button>
            )}
            {mention.is_approved && (
              <Badge variant="secondary" className="text-xs h-6">Approved</Badge>
            )}
            <a href={mention.instagram_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted" aria-label={`View @${mention.author_username}'s post on Instagram`}>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
