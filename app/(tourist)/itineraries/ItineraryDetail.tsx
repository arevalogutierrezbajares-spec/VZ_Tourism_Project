'use client';

import { MapPin, Clock, DollarSign, X, ChevronDown, ChevronUp, Compass, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, getInitials } from '@/lib/utils';
import { useItineraryStore } from '@/stores/itinerary-store';
import { useRouter } from 'next/navigation';
import type { Itinerary, ItineraryStop } from '@/types/database';
import { useState, useEffect, useRef, useCallback } from 'react';

interface ItineraryDetailProps {
  itinerary: Itinerary & { recommendation_count?: number };
  onClose: () => void;
}

export function ItineraryDetail({ itinerary, onClose }: ItineraryDetailProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [templateCopied, setTemplateCopied] = useState(false);
  const { setItinerary, openPanel } = useItineraryStore();
  const router = useRouter();
  const stops = itinerary.stops || [];
  const totalDays = itinerary.total_days || 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const toggleDay = (day: number) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  // Focus trap + Escape to close + autofocus close button
  useEffect(() => {
    closeButtonRef.current?.focus();
    const previouslyFocused = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Itinerary details: ${itinerary.title}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="relative bg-background rounded-2xl shadow-2xl max-w-3xl w-full mx-4 my-8 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
      >
        {/* Hero image */}
        {itinerary.cover_image_url && (
          <div className="relative h-56 md:h-72 overflow-hidden">
            <img
              src={itinerary.cover_image_url}
              alt={`Cover image for ${itinerary.title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-6 right-16 text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-1">{itinerary.title}</h2>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span>{itinerary.total_days} days</span>
                <span aria-hidden="true">·</span>
                <span>{itinerary.regions.join(' → ')}</span>
                <span aria-hidden="true">·</span>
                <span>{formatCurrency(itinerary.estimated_cost_usd)}/person</span>
              </div>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close itinerary details"
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors z-10 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-6">
          {/* Creator + stats row */}
          <div className="flex items-center justify-between">
            {itinerary.user && (
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {getInitials(itinerary.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{itinerary.user.full_name}</p>
                  {itinerary.user.role === 'creator' && (
                    <Badge variant="secondary" className="text-[10px]">Creator</Badge>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="text-primary font-semibold">
                {((itinerary as unknown as Record<string, unknown>).recommendation_count as number || itinerary.saves + itinerary.likes).toLocaleString()} recommend
              </span>
              <span>{itinerary.views.toLocaleString()} views</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">{itinerary.description}</p>

          {/* Tags */}
          {itinerary.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {itinerary.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Day-by-day itinerary */}
          <div>
            <h3 className="font-bold text-lg mb-4">Day-by-Day Itinerary</h3>
            <div className="space-y-2">
              {Array.from({ length: totalDays }).map((_, idx) => {
                const day = idx + 1;
                const dayStops = stops.filter(s => s.day === day).sort((a, b) => a.order - b.order);
                const isExpanded = expandedDay === day;

                return (
                  <div key={day} className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleDay(day)}
                      aria-expanded={isExpanded}
                      aria-controls={`day-${day}-stops`}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {day}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Day {day}</p>
                          {dayStops.length > 0 && (
                            <p className="text-xs text-muted-foreground">{dayStops[0].title}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayStops.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(dayStops.reduce((sum, s) => sum + s.cost_usd, 0))}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && dayStops.length > 0 && (
                      <div id={`day-${day}-stops`} className="px-4 pb-4 space-y-3 border-t bg-muted/20">
                        {dayStops.map((stop, i) => (
                          <div key={stop.id || i} className="pt-3">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Compass className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{stop.title}</p>
                                {stop.description && (
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{stop.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                  {stop.location_name && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {stop.location_name}
                                    </span>
                                  )}
                                  {stop.duration_hours && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {stop.duration_hours}h
                                    </span>
                                  )}
                                  {stop.cost_usd > 0 && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" /> {formatCurrency(stop.cost_usd)}
                                    </span>
                                  )}
                                </div>
                                {stop.notes && (
                                  <div className="mt-2 p-2.5 bg-background rounded-lg border text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Tip: </span>{stop.notes}
                                  </div>
                                )}
                                {stop.transport_to_next && (
                                  <p className="text-[11px] text-primary/70 mt-1.5">Next: {stop.transport_to_next}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && dayStops.length === 0 && (
                      <div id={`day-${day}-stops`} className="px-4 pb-4 border-t">
                        <p className="text-sm text-muted-foreground italic pt-3">Flexible day, no fixed plans</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="flex gap-3 pt-2 border-t">
            <Button
              size="lg"
              className="flex-1 font-semibold"
              onClick={() => {
                const now = new Date().toISOString();
                const cloned = {
                  ...itinerary,
                  id: `local-${Date.now()}`,
                  user_id: 'local',
                  title: itinerary.title,
                  is_public: false,
                  created_at: now,
                  updated_at: now,
                  stops: (itinerary.stops ?? []).map((s) => ({
                    ...s,
                    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    itinerary_id: '',
                    created_at: now,
                  })),
                };
                setItinerary(cloned);
                openPanel();
                onClose();
                router.push('/itineraries/draft');
              }}
            >
              Book This Trip
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => {
                const now = new Date().toISOString();
                const cloned = {
                  ...itinerary,
                  id: `local-${Date.now()}`,
                  user_id: 'local',
                  title: `${itinerary.title} (my version)`,
                  is_public: false,
                  created_at: now,
                  updated_at: now,
                  stops: (itinerary.stops ?? []).map((s) => ({
                    ...s,
                    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    itinerary_id: '',
                    created_at: now,
                  })),
                };
                setItinerary(cloned);
                openPanel();
                setTemplateCopied(true);
                setTimeout(() => {
                  setTemplateCopied(false);
                  onClose();
                  router.push('/itineraries/draft');
                }, 1200);
              }}
            >
              {templateCopied ? (
                <><CheckCircle className="w-4 h-4 mr-1.5 text-green-500" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1.5" /> Use as Template</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
