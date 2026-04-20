'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_SEARCH_SUGGESTIONS } from '@/lib/constants';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

export function SearchBar({ onSearch, isLoading, className, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % AI_SEARCH_SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)} role="search">
      <div className="relative flex items-center">
        <label htmlFor="search-input" className="sr-only">Search Venezuela experiences</label>
        <div className="absolute left-4 text-muted-foreground" aria-hidden="true">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || AI_SEARCH_SUGGESTIONS[currentPlaceholder]}
          className={cn(
            'w-full pl-11 pr-12 py-3 rounded-2xl',
            'bg-background border border-border',
            'shadow-lg text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'transition-all duration-200'
          )}
          disabled={isLoading}
          aria-describedby={isLoading ? 'search-loading' : undefined}
        />
        {isLoading && <span id="search-loading" className="sr-only">Searching...</span>}
        <button
          type="button"
          className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
          aria-label="Voice search"
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
