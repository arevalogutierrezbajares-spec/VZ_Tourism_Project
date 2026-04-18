'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, MapPin, Calendar, Minus, Plus, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Itinerary } from '@/types/database';

const DESTINATIONS = [
  { id: 'Los Roques', emoji: '🏝️' },
  { id: 'Mérida', emoji: '⛰️' },
  { id: 'Margarita', emoji: '🌊' },
  { id: 'Canaima', emoji: '💧' },
  { id: 'Choroní', emoji: '🌴' },
  { id: 'Caracas', emoji: '🏙️' },
  { id: 'Morrocoy', emoji: '🤿' },
  { id: 'Gran Sabana', emoji: '🌄' },
];

interface WizardProps {
  onClose: () => void;
}

function WizardContent({ onClose }: WizardProps) {
  const router = useRouter();
  const { setItinerary, openPanel } = useItineraryStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(5);

  const titlePlaceholder = destination
    ? `${destination} Adventure`
    : 'My Venezuela Trip';

  const handleCreate = () => {
    const finalTitle = title.trim() || titlePlaceholder;
    const id = `local-${Date.now()}`;
    const now = new Date().toISOString();

    const newItinerary: Itinerary = {
      id,
      user_id: 'local',
      title: finalTitle,
      description: null,
      cover_image_url: null,
      start_date: startDate || null,
      end_date: null,
      is_public: false,
      is_template: false,
      is_influencer_pick: false,
      referral_code: null,
      total_days: days,
      estimated_cost_usd: 0,
      regions: destination ? [destination] : [],
      tags: [],
      likes: 0,
      saves: 0,
      views: 0,
      created_at: now,
      updated_at: now,
      stops: [],
    };

    setItinerary(newItinerary);
    openPanel();
    onClose();
    router.push('/itineraries/draft');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">New Itinerary</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ─── Step 1: Name + Destination + Date ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-0.5">Plan your trip</h2>
                <p className="text-sm text-muted-foreground">Give your itinerary a name and pick where you're headed.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Trip name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={titlePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Destination
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DESTINATIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDestination(destination === d.id ? '' : d.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-colors ${
                        destination === d.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-xl">{d.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight">{d.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Start date
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Duration ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-0.5">How many days?</h2>
                <p className="text-sm text-muted-foreground">You can always add or remove days later.</p>
              </div>

              <div className="flex items-center justify-center gap-6 py-6">
                <button
                  type="button"
                  onClick={() => setDays(Math.max(1, days - 1))}
                  disabled={days <= 1}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <span className="text-6xl font-bold tabular-nums">{days}</span>
                  <p className="text-sm text-muted-foreground mt-1">{days === 1 ? 'day' : 'days'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDays(Math.min(21, days + 1))}
                  disabled={days >= 21}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick-pick presets */}
              <div className="flex gap-2 justify-center">
                {[3, 5, 7, 10, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      days === d ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 3: Confirm ─── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{title.trim() || titlePlaceholder}</h2>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mt-2">
                  {destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {destination}
                    </span>
                  )}
                  <span>{days} {days === 1 ? 'day' : 'days'}</span>
                  {startDate && <span>{startDate}</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your itinerary is ready. Start adding stops from any listing page, or use the map.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-1">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Start Planning <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ItineraryWizard({ onClose }: WizardProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(<WizardContent onClose={onClose} />, document.body);
}
