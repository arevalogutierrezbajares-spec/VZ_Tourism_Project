'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  User,
  Loader2,
  Send,
  X,
  Sparkles,
  Check,
  MapPin,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useItineraryStore } from '@/stores/itinerary-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { AIGeneratedDay } from '@/types/database';
import { buildStopFromAI } from '@/types/database';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  // Split by **bold** spans
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      if (nodes.length > 0) nodes.push(<div key={`sp-${i}`} className="h-1" />);
      continue;
    }

    // Destination card: **Name** — description
    if (/^\*\*[^*]+\*\*\s*[—–-]/.test(line)) {
      nodes.push(
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span>{renderInline(line)}</span>
        </div>
      );
      continue;
    }

    // Bullet list item
    if (/^[-•]\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="text-primary mt-1.5 shrink-0 text-[8px]">●</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="font-semibold text-primary/80 shrink-0 text-xs mt-0.5 min-w-[16px]">
            {numMatch[1]}.
          </span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular text
    nodes.push(
      <p key={i} className="text-sm">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-1.5">{nodes}</div>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanningChatPanelProps {
  /** When true, renders as side panel with fixed positioning (legacy). When false, fills parent. */
  isOpen?: boolean;
  onClose?: () => void;
  /** Called when a <day-plan> event arrives from the stream */
  onDayPlan?: (day: AIGeneratedDay) => void;
  /** Called when the full <itinerary-json> arrives */
  onItinerary?: (days: AIGeneratedDay[]) => void;
  /** Render mode: 'panel' for legacy side panel, 'full' for /plan page, 'compact' for TripSidePanel */
  mode?: 'panel' | 'full' | 'compact';
  /** Called once sendMessage is ready — lets parent wire SmartStarters externally */
  onReady?: (send: (text: string) => void) => void;
  className?: string;
}

// Strip XML tags from displayed text
function cleanStreamText(text: string): string {
  return text
    .replace(/<itinerary-json>[\s\S]*?<\/itinerary-json>/g, '')
    .replace(/<day-plan[\s\S]*?<\/day-plan>/g, '')
    .trim();
}

export function PlanningChatPanel({
  isOpen = true,
  onClose,
  onDayPlan,
  onItinerary,
  mode = 'panel',
  onReady,
  className,
}: PlanningChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [generatedItinerary, setGeneratedItinerary] = useState<
    AIGeneratedDay[] | null
  >(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { addStop, addDay, current } = useItineraryStore();

  // Abort any in-flight request when the panel closes or unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: text };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsStreaming(true);
      setStreamingText('');
      setGeneratedItinerary(null);
      setLastFailedMessage(null);

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch('/api/itineraries/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || 'Trip planner is temporarily unavailable');
        }
        if (!response.body) throw new Error('No stream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let streamDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(line.slice(6));

              if (payload.type === 'text') {
                fullText += payload.text;
                setStreamingText(fullText);
              } else if (payload.type === 'day-plan') {
                // Progressive building — a single day was confirmed
                onDayPlan?.(payload.data);
              } else if (payload.type === 'itinerary') {
                const raw = payload.data;
                const days = Array.isArray(raw) ? raw : Array.isArray(raw?.days) ? raw.days : null;
                if (days) {
                  setGeneratedItinerary(days);
                  onItinerary?.(days);
                }
              } else if (payload.type === 'done') {
                streamDone = true;
                const cleanText = cleanStreamText(fullText);
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: cleanText },
                ]);
                setStreamingText('');
              } else if (payload.type === 'error') {
                toast.error(payload.message || 'Something went wrong');
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Stream ended without a 'done' event — commit partial text so it isn't lost
        if (!streamDone && fullText.trim()) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: cleanStreamText(fullText) },
          ]);
          setStreamingText('');
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Chat error:', error);
        const errorMsg = (error as Error).message || 'Failed to send message';
        setLastFailedMessage(text);
        // Remove the user message that failed so retry doesn't duplicate
        setMessages((prev) => prev.slice(0, -1));
        setStreamingText('');
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, onDayPlan, onItinerary]
  );

  // Keep a stable ref so the wrapper we pass to onReady always calls the latest sendMessage.
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  useEffect(() => {
    onReady?.((text) => sendMessageRef.current(text));
    // onReady is intentionally called once on mount — the wrapper delegates to the latest sendMessage via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleAcceptItinerary = () => {
    if (!generatedItinerary) return;

    const itineraryId = current?.id || '';
    const currentDays = useItineraryStore.getState().days;
    for (let i = currentDays.length; i < generatedItinerary.length; i++) {
      addDay();
    }

    for (const genDay of generatedItinerary) {
      for (let i = 0; i < genDay.stops.length; i++) {
        addStop(buildStopFromAI(genDay.stops[i], itineraryId, genDay.day, i));
      }
    }

    const totalStops = generatedItinerary.reduce(
      (sum, d) => sum + d.stops.length,
      0
    );
    toast.success(
      `Added ${generatedItinerary.length}-day itinerary with ${totalStops} stops!`
    );
    setGeneratedItinerary(null);
    onClose?.();
  };

  if (mode === 'panel' && !isOpen) return null;

  const isFullMode = mode === 'full';
  const isCompactMode = mode === 'compact';

  return (
    <div
      className={cn(
        'flex flex-col',
        isFullMode
          ? 'h-full w-full bg-background'
          : isCompactMode
          ? 'h-full w-full bg-background'
          : 'fixed right-80 top-0 h-full w-96 bg-background shadow-2xl border-l z-30',
        className
      )}
    >
      {/* Header — hidden in compact mode (parent provides header) */}
      {!isCompactMode && (
        <div className={cn(
          'flex items-center justify-between border-b',
          isFullMode ? 'p-5' : 'p-4'
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              'rounded-full bg-primary flex items-center justify-center',
              isFullMode ? 'w-8 h-8' : 'w-7 h-7'
            )}>
              <Bot className={cn(isFullMode ? 'w-4.5 h-4.5' : 'w-4 h-4', 'text-white')} />
            </div>
            <div>
              <h3 className={cn('font-semibold', isFullMode ? 'text-base' : 'text-sm')}>
                Trip Planner
              </h3>
              <p className="text-xs text-muted-foreground">
                AI-powered itinerary assistant
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="min-w-[40px] min-h-[40px] w-9 h-9"
              onClick={onClose}
              aria-label="Close trip planner"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div role="log" aria-live="polite" aria-label="Trip planner conversation" className={cn('space-y-4', isFullMode ? 'p-5' : isCompactMode ? 'p-3' : 'p-4')}>
          {/* Welcome */}
          {messages.length === 0 && !isStreaming && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className={cn(
                'rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted/50',
                isFullMode ? 'max-w-[75%]' : 'max-w-[85%]'
              )}>
                <p>Where in Venezuela? 🇻🇪</p>
              </div>
            </div>
          )}

          {/* Conversation */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  msg.role === 'user'
                    ? 'bg-primary text-white'
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
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  isFullMode ? 'max-w-[75%]' : 'max-w-[85%]',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-muted/50 rounded-tl-sm'
                )}
              >
                {msg.role === 'assistant'
                  ? renderMarkdown(msg.content)
                  : <p className="whitespace-pre-wrap">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className={cn(
                'rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted/50',
                isFullMode ? 'max-w-[75%]' : 'max-w-[85%]'
              )}>
                {renderMarkdown(cleanStreamText(streamingText))}
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Streaming indicator — typing dots instead of spinner */}
          {isStreaming && !streamingText && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/50 flex items-center gap-1" aria-label="AI is thinking">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Error state with retry */}
          {lastFailedMessage && !isStreaming && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Failed to get a response</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Something went wrong. Your message was not sent.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const msg = lastFailedMessage;
                  setLastFailedMessage(null);
                  sendMessage(msg);
                }}
                className="gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </Button>
            </div>
          )}

          {/* Generated itinerary acceptance card */}
          {Array.isArray(generatedItinerary) && generatedItinerary.length > 0 && (
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">
                  Itinerary Ready
                </span>
              </div>

              <div className="space-y-2">
                {generatedItinerary.map((day) => (
                  <div key={day.day} className="space-y-1">
                    <p className="text-xs font-medium">
                      Day {day.day}: {day.title}
                    </p>
                    {day.stops.map((stop, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground ml-3"
                      >
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{stop.title}</span>
                        {stop.cost_usd > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0 shrink-0 tabular-nums"
                          >
                            ${stop.cost_usd}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleAcceptItinerary}>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Add to Itinerary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGeneratedItinerary(null);
                    sendMessage("Let's adjust this — can you change it?");
                  }}
                >
                  Adjust
                </Button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} aria-label="Trip planning conversation" className={cn('border-t', isFullMode ? 'p-5' : 'p-3')}>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your ideal trip..."
            disabled={isStreaming}
            className={cn('flex-1', isFullMode && 'h-11')}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className={cn('min-w-[40px] min-h-[40px] active:scale-[0.96] transition-[transform,background-color,opacity]', isFullMode && 'h-11 w-11')}
            aria-label={isStreaming ? 'Sending message' : 'Send message'}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center text-pretty">
          AI-generated suggestions — verify details before booking
        </p>
      </form>
    </div>
  );
}
