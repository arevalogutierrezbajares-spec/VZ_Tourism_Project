'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, MapPin, Calendar, Minus, Plus, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, transition: { duration: 0.15, ease: 'easeIn' } }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative bg-background rounded-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">New Itinerary</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-[background-color] min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-[background-color] duration-300 ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5 space-y-5">
          <AnimatePresence mode="wait" initial={false}>
          {/* ─── Step 1: Name + Destination + Date ─── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold mb-0.5 text-balance">Plan your trip</h2>
                <p className="text-sm text-muted-foreground text-pretty">Give your itinerary a name and pick where you&apos;re headed.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Trip name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={titlePlaceholder}
                  className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-[box-shadow,border-color]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Destination
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DESTINATIONS.map((d) => (
                    <motion.button
                      key={d.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setDestination(destination === d.id ? '' : d.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-[border-color,background-color,color] min-h-[40px] ${
                        destination === d.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-xl">{d.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight">{d.id}</span>
                    </motion.button>
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
                  className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-[box-shadow,border-color]"
                />
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Duration ─── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold mb-0.5 text-balance">How many days?</h2>
                <p className="text-sm text-muted-foreground text-pretty">You can always add or remove days later.</p>
              </div>

              <div className="flex items-center justify-center gap-6 py-6">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDays(Math.max(1, days - 1))}
                  disabled={days <= 1}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center hover:bg-muted transition-[background-color] disabled:opacity-30"
                >
                  <Minus className="w-5 h-5" />
                </motion.button>
                <div className="text-center">
                  <span className="text-6xl font-bold tabular-nums">{days}</span>
                  <p className="text-sm text-muted-foreground mt-1">{days === 1 ? 'day' : 'days'}</p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDays(Math.min(21, days + 1))}
                  disabled={days >= 21}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center hover:bg-muted transition-[background-color] disabled:opacity-30"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Quick-pick presets */}
              <div className="flex gap-2 justify-center">
                {[3, 5, 7, 10, 14].map((d) => (
                  <motion.button
                    key={d}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-[border-color,background-color,color] min-w-[40px] min-h-[40px] flex items-center justify-center tabular-nums ${
                      days === d ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {d}d
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Confirm ─── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="space-y-4"
            >
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
                <h2 className="text-xl font-bold text-balance">{title.trim() || titlePlaceholder}</h2>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mt-2 tabular-nums">
                  {destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {destination}
                    </span>
                  )}
                  <span>{days} {days === 1 ? 'day' : 'days'}</span>
                  {startDate && <span>{startDate}</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center text-pretty">
                Your itinerary is ready. Start adding stops from any listing page, or use the map.
              </p>
            </motion.div>
          )}

          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-1">
            {step > 1 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-[background-color] min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </motion.button>
            )}
            {step < 3 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-[background-color] min-h-[44px]"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
            {step === 3 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleCreate}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-[background-color] min-h-[44px]"
              >
                Start Planning <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ItineraryWizard({ onClose }: WizardProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(<WizardContent onClose={onClose} />, document.body);
}
