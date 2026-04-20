'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  listingId: string;
  className?: string;
}

export function FavoriteButton({ listingId, className }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const router = useRouter();

  const favorited = isAuthenticated && isFavorited(listingId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login?redirectTo=' + encodeURIComponent(window.location.pathname));
      return;
    }
    toggleFavorite(listingId);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex items-center justify-center min-w-[40px] min-h-[40px] w-11 h-11 rounded-full bg-white/90',
        'shadow-sm transition-[background-color] duration-150 ease-out hover:bg-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'cursor-pointer',
        className
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={favorited}
      title={!isAuthenticated ? 'Sign in to save' : undefined}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={favorited ? 'filled' : 'outline'}
          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className="flex items-center justify-center"
        >
          <Heart
            className={cn(
              'w-5 h-5',
              favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
            )}
            aria-hidden="true"
          />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
