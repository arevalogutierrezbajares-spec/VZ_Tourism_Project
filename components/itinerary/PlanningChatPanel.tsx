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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useItineraryStore } from '@/stores/itinerary-store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedDay {
  day: number;
  title: string;
  stops: {
    listing_id: string | null;
    title: string;
    description: string;
    location_name: string;
    latitude: number | null;
    longitude: number | null;
    cost_usd: number;
    duration_hours: number | null;
  }[];
}

interface PlanningChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function PlanningChatPanel({
  isOpen,
  onClose,
  className,
}: PlanningChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedItinerary, setGeneratedItinerary] = useState<
    GeneratedDay[] | null
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

        if (!response.ok) throw new Error('Failed');
        if (!response.body) throw new Error('No stream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

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
              } else if (payload.type === 'itinerary') {
                setGeneratedItinerary(payload.data);
              } else if (payload.type === 'done') {
                // Clean the displayed text — remove itinerary JSON tags
                const cleanText = fullText
                  .replace(/<itinerary-json>[\s\S]*?<\/itinerary-json>/g, '')
                  .trim();
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
      } catch (error) {
        console.error('Chat error:', error);
        toast.error('Failed to send message');
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleAcceptItinerary = () => {
    if (!generatedItinerary) return;

    const currentDays = useItineraryStore.getState().days;
    for (
      let i = currentDays.length;
      i < generatedItinerary.length;
      i++
    ) {
      addDay();
    }

    for (const genDay of generatedItinerary) {
      for (let i = 0; i < genDay.stops.length; i++) {
        const stop = genDay.stops[i];
        addStop({
          itinerary_id: current?.id || '',
          listing_id: stop.listing_id || null,
          day: genDay.day,
          order: i,
          title: stop.title,
          description: stop.description || null,
          latitude: stop.latitude ?? null,
          longitude: stop.longitude ?? null,
          location_name: stop.location_name || null,
          cost_usd: stop.cost_usd || 0,
          duration_hours: stop.duration_hours ?? null,
          start_time: null,
          end_time: null,
          transport_to_next: null,
          transport_duration_minutes: null,
          notes: null,
          source_type: 'ai_suggested',
        });
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
    onClose();
  };

  const starters = [
    "I want to explore beaches and nature for about a week",
    "Plan a 3-day adventure trip for two",
    "What's the best way to see Angel Falls?",
    "I have 5 days, mix of culture and relaxation",
  ];

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed right-80 top-0 h-full w-96 bg-background shadow-2xl border-l z-30',
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Trip Planner</h3>
            <p className="text-xs text-muted-foreground">
              AI-powered itinerary assistant
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !isStreaming && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted/50 max-w-[85%]">
                  <p>
                    Hey! I&apos;m your Venezuela trip planner. Tell me what
                    kind of experience you&apos;re looking for and I&apos;ll
                    help build your perfect itinerary.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 ml-9">
                <p className="text-xs text-muted-foreground">
                  Try one of these:
                </p>
                {starters.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
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
                  'rounded-2xl px-4 py-2.5 text-sm max-w-[85%] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-muted/50 rounded-tl-sm'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted/50 max-w-[85%]">
                <p className="whitespace-pre-wrap">
                  {streamingText.replace(
                    /<itinerary-json>[\s\S]*?<\/itinerary-json>/g,
                    ''
                  )}
                </p>
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && !streamingText && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/50">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Generated itinerary acceptance card */}
          {generatedItinerary && (
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
                            className="text-[10px] px-1 py-0 shrink-0"
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
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your ideal trip..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
