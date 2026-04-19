'use client';

import { useState } from 'react';
import { Share2, Check, Link as LinkIcon } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url?: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to copy
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      aria-label="Share itinerary"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Link copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
          <LinkIcon className="w-3.5 h-3.5 opacity-50" />
        </>
      )}
    </button>
  );
}
