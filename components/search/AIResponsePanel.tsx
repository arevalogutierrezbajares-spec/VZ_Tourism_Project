'use client';

import { useRef, useEffect } from 'react';
import { Bot, User, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchStore } from '@/stores/search-store';
import { ListingCard } from '@/components/listing/ListingCard';
import { SuggestionChips } from './SuggestionChips';
import { cn } from '@/lib/utils';

interface AIResponsePanelProps {
  onSearch: (query: string) => void;
  onClose?: () => void;
  className?: string;
}

export function AIResponsePanel({ onSearch, onClose, className }: AIResponsePanelProps) {
  const { conversationHistory, isStreaming, streamingText, results, suggestions, hasSearched } =
    useSearchStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, streamingText]);

  if (!hasSearched) return null;

  return (
    <div
      className={cn(
        'flex flex-col bg-background rounded-2xl shadow-2xl border border-border',
        'max-h-[calc(100vh-200px)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">VZ Explorer AI</span>
          {isStreaming && (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose} aria-label="Close AI panel">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Conversation history */}
          {conversationHistory.map((msg, i) => (
            <div
              key={i}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm max-w-[85%] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted max-w-[85%]">
                <p className="whitespace-pre-wrap">{streamingText}</p>
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Listing results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {results.length} experience{results.length !== 1 ? 's' : ''} found
              </p>
              <div className="space-y-2">
                {results.slice(0, 5).map((listing) => (
                  <ListingCard key={listing.id} listing={listing} compact />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!isStreaming && suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try asking about:</p>
              <SuggestionChips suggestions={suggestions.slice(0, 4)} onSelect={onSearch} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
