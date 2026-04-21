'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Compass,
  MessageSquare,
  CalendarCheck,
  X,
} from 'lucide-react';
import { ShareButton } from '@/components/itinerary/ShareButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItineraryStopCard } from '@/components/itinerary/ItineraryStopCard';
import { BookActions } from '@/components/itinerary/BookActions';
import { ReactionBar } from '@/components/social/ReactionBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';
import type { ItineraryStop } from '@/types/database';

const PLAN_STEPS = [
  {
    icon: Compass,
    title: 'Explore',
    description: 'Browse curated stops and local gems',
    gradient: 'from-primary/70 to-primary',
  },
  {
    icon: MessageSquare,
    title: 'Plan with AI',
    description: 'Chat to customize your perfect trip',
    gradient: 'from-accent/70 to-accent',
  },
  {
    icon: CalendarCheck,
    title: 'Book',
    description: 'Reserve directly with verified partners',
    gradient: 'from-secondary/70 to-secondary',
  },
];

interface ItineraryViewPanelProps {
  itinerary: {
    id: string;
    title: string;
    description?: string | null;
    user?: { id: string; full_name: string; avatar_url: string | null; role: string } | null;
    regions: string[];
    total_days: number;
    estimated_cost_usd: number;
    start_date?: string | null;
    likes: number;
    saves: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stops: any[];
  discountDisplay: { code: string; label: string } | null;
}

export function ItineraryViewPanel({ itinerary: it, stops, discountDisplay }: ItineraryViewPanelProps) {
  const router = useRouter();
  const totalDays = it.total_days || 1;

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/explore');
    }
  };

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-background shadow-2xl border-l flex flex-col h-dvh"
      >
        {/* Fixed header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
          <h2 className="text-sm font-semibold truncate pr-4">{it.title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 shrink-0 cursor-pointer"
            onClick={handleClose}
            aria-label="Close itinerary"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Header info */}
            <div className="space-y-3">
              {it.description && (
                <p className="text-muted-foreground text-sm text-pretty">{it.description}</p>
              )}

              {/* Author */}
              {it.user && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={it.user.avatar_url || undefined} alt={`${it.user.full_name}'s avatar`} />
                    <AvatarFallback className="text-xs">{getInitials(it.user.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">by</span>
                  <span className="text-xs font-medium">{it.user.full_name}</span>
                  {it.user.role === 'creator' && (
                    <Badge variant="secondary" className="text-[10px] bg-status-pending/10 text-status-pending border-status-pending/20">Creator</Badge>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  {totalDays} day{totalDays !== 1 ? 's' : ''}
                </span>
                {it.start_date && (
                  <span className="bg-muted/50 px-2.5 py-1 rounded-full">{formatDate(it.start_date)}</span>
                )}
                {it.estimated_cost_usd > 0 && (
                  <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full">
                    <DollarSign className="w-3.5 h-3.5" />
                    From {formatCurrency(it.estimated_cost_usd)}
                  </span>
                )}
                {it.regions.length > 0 && (
                  <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    {it.regions.join(', ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <ReactionBar likes={it.likes} saves={it.saves} className="-ml-2" />
                <ShareButton title={it.title} />
              </div>

              {/* Discount */}
              {discountDisplay && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-status-pending/10 border border-status-pending/20">
                  <Tag className="w-3.5 h-3.5 text-status-pending shrink-0" />
                  <span className="text-xs text-foreground flex-1">
                    Code <span className="font-mono font-bold">{discountDisplay.code}</span>
                    {' '}for <span className="font-semibold">{discountDisplay.label}</span>
                  </span>
                </div>
              )}

              {/* Book CTA */}
              <BookActions itineraryId={it.id} itineraryTitle={it.title} />
            </div>

            {/* Days */}
            <div className="space-y-4">
              {Array.from({ length: totalDays }).map((_, dayIdx) => {
                const day = dayIdx + 1;
                const dayStops = stops.filter((s) => s.day === day);

                return (
                  <div key={day} className="rounded-xl border bg-background shadow-sm overflow-hidden">
                    {/* Day header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                        {day}
                      </div>
                      <h3 className="font-semibold text-sm">Day {day}</h3>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {dayStops.length} {dayStops.length === 1 ? 'stop' : 'stops'}
                      </span>
                    </div>

                    {/* Stops */}
                    <div className="p-3 space-y-2">
                      {dayStops.map((stop: ItineraryStop) => (
                        <ItineraryStopCard key={stop.id} stop={stop} showPhoto />
                      ))}
                      {dayStops.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">No stops planned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3-step CTA */}
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Want your own trip?</h3>
              <div className="grid grid-cols-3 gap-2">
                {PLAN_STEPS.map((step, idx) => (
                  <div key={step.title} className="flex flex-col items-center text-center p-2.5 rounded-lg bg-background border">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-2 shadow-sm`}>
                      <step.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Step {idx + 1}</span>
                    <span className="font-medium text-xs">{step.title}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Link
                  href="/plan"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Start Planning
                </Link>
              </div>
            </div>

          </div>
        </div>
      </motion.aside>
    </div>
  );
}
