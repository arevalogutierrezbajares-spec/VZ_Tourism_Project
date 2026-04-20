'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const chipVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipsProps) {
  return (
    <motion.div
      className={cn('flex flex-wrap gap-2', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {suggestions.map((suggestion) => (
        <motion.button
          key={suggestion}
          variants={chipVariants}
          onClick={() => onSelect(suggestion)}
          whileTap={{ scale: 0.96 }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium',
            'bg-background/80 border border-border',
            'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            'backdrop-blur-sm cursor-pointer',
            'transition-[background-color,color,border-color,box-shadow] duration-200'
          )}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
