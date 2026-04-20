'use client';

import { useState } from 'react';
import { Heart, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReactionBarProps {
  likes: number;
  saves: number;
  onLike?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
  isSaved?: boolean;
  className?: string;
}

export function ReactionBar({
  likes,
  saves,
  onLike,
  onSave,
  onShare,
  isLiked = false,
  isSaved = false,
  className,
}: ReactionBarProps) {
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [likeCount, setLikeCount] = useState(likes);
  const [saveCount, setSaveCount] = useState(saves);

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));
    onLike?.();
  };

  const handleSave = () => {
    setSaved((prev) => !prev);
    setSaveCount((prev) => prev + (saved ? -1 : 1));
    onSave?.();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
      onShare?.();
    } catch {
      // User cancelled share or clipboard unavailable
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label="Reactions">
      <Button
        variant="ghost"
        size="sm"
        className={cn('gap-1.5 min-h-[44px] min-w-[44px]', liked && 'text-red-500')}
        onClick={handleLike}
        aria-label={liked ? `Unlike (${likeCount} likes)` : `Like (${likeCount} likes)`}
        aria-pressed={liked}
      >
        <Heart className={cn('w-4 h-4', liked && 'fill-red-500')} />
        <span className="text-xs">{likeCount}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn('gap-1.5 min-h-[44px] min-w-[44px]', saved && 'text-primary')}
        onClick={handleSave}
        aria-label={saved ? `Unsave (${saveCount} saves)` : `Save (${saveCount} saves)`}
        aria-pressed={saved}
      >
        <Bookmark className={cn('w-4 h-4', saved && 'fill-primary')} />
        <span className="text-xs">{saveCount}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="min-h-[44px] min-w-[44px]"
        onClick={handleShare}
        aria-label="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
