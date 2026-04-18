'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { AIResponsePanel } from '@/components/search/AIResponsePanel';
import { SuggestionChips } from '@/components/search/SuggestionChips';
import { useSearch } from '@/hooks/use-search';
import { AI_SEARCH_SUGGESTIONS } from '@/lib/constants';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function Overlay({ onClose }: { onClose: () => void }) {
  const { search, isStreaming, hasSearched, suggestions, clearConversation } = useSearch();
  const inputRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleClose = () => {
    clearConversation();
    onClose();
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : AI_SEARCH_SUGGESTIONS.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel — slides down from top */}
      <div className="relative z-10 w-full bg-background border-b shadow-2xl max-h-[90vh] flex flex-col">
        {/* Search bar row */}
        <div className="container px-4 py-4 flex items-center gap-3" ref={inputRef}>
          <SearchBar
            onSearch={search}
            isLoading={isStreaming}
            className="flex-1"
            placeholder="Where do you want to go? Ask anything…"
          />
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suggestions or results */}
        <div className="container px-4 pb-4 overflow-y-auto flex-1">
          {!hasSearched ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Try asking
              </p>
              <SuggestionChips
                suggestions={displaySuggestions}
                onSelect={search}
              />
            </div>
          ) : (
            <AIResponsePanel onSearch={search} />
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(<Overlay onClose={onClose} />, document.body);
}
