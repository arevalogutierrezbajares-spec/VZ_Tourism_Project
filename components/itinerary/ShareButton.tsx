'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Check, Link as LinkIcon } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  url?: string;
}

const iconSwap = {
  initial: { scale: 0.25, opacity: 0, filter: 'blur(4px)' },
  animate: { scale: 1, opacity: 1, filter: 'blur(0px)' },
  exit: { scale: 0.25, opacity: 0, filter: 'blur(4px)' },
  transition: { type: 'spring' as const, duration: 0.3, bounce: 0 },
};

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
    <motion.button
      onClick={handleShare}
      whileTap={{ scale: 0.96 }}
      className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-[color,border-color] duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      aria-label={copied ? 'Link copied to clipboard' : `Share ${title}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="copied" className="inline-flex items-center gap-2 text-status-confirmed" {...iconSwap}>
            <Check className="w-4 h-4" />
            <span>Link copied!</span>
          </motion.span>
        ) : (
          <motion.span key="share" className="inline-flex items-center gap-2" {...iconSwap}>
            <Share2 className="w-4 h-4" />
            <span>Share</span>
            <LinkIcon className="w-3.5 h-3.5 opacity-50" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
