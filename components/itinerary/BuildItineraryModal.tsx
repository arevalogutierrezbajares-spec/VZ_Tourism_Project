'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Map, ClipboardList, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface BuildItineraryModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'choose' | 'paste';
type Option = 'ai' | 'map' | 'paste';

const OPTIONS: {
  id: Option;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}[] = [
  {
    id: 'ai',
    icon: Sparkles,
    title: 'Describe my dream trip',
    description: 'Tell our AI what you have in mind — destination, vibe, duration — and it will build your itinerary',
    badge: 'Most popular',
  },
  {
    id: 'map',
    icon: Map,
    title: 'Browse the map',
    description: 'Explore Venezuela interactively and hand-pick the places you want to visit',
  },
  {
    id: 'paste',
    icon: ClipboardList,
    title: 'Import an existing plan',
    description: 'Paste notes, a rough outline, or inspiration — our AI will structure it into a proper itinerary',
  },
];

export function BuildItineraryModal({ open, onClose }: BuildItineraryModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<Option | null>(null);
  const [pasteText, setPasteText] = useState('');

  function reset() {
    setStep('choose');
    setSelected(null);
    setPasteText('');
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  function handleContinue() {
    if (!selected) return;

    if (selected === 'ai') {
      handleClose();
      router.push('/map?mode=ai');
    } else if (selected === 'map') {
      handleClose();
      router.push('/map');
    } else {
      // paste option
      if (step === 'choose') {
        setStep('paste');
        return;
      }
      const encoded = encodeURIComponent(pasteText.trim().slice(0, 800));
      handleClose();
      router.push(`/map?plan=${encoded}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        showCloseButton={step === 'choose'}
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden"
      >
        {step === 'choose' ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-900" />
                </div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Build my itinerary with AI
                </DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground ml-10">
                How would you like to start?
              </p>
            </div>

            {/* Option cards */}
            <div className="px-6 pb-5 space-y-2.5">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-150 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-border hover:border-border/80 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-150 ${
                        isSelected
                          ? 'bg-amber-400 text-amber-900'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-sm ${
                            isSelected ? 'text-amber-700 dark:text-amber-400' : ''
                          }`}
                        >
                          {opt.title}
                        </span>
                        {opt.badge && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    {/* Checkmark */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150 ${
                        isSelected
                          ? 'bg-amber-400 scale-100 opacity-100'
                          : 'bg-muted scale-75 opacity-0'
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleContinue}
                disabled={!selected}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50 hover:scale-[1.01] active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Paste step header */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setStep('choose')}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded-lg hover:bg-muted"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Import your plan
                </DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Paste anything — notes from a travel blog, a rough list of places, a draft schedule. Our AI will read it and build a proper itinerary.
              </p>
            </div>

            {/* Textarea */}
            <div className="px-6 pb-5">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`e.g. "5 days in Venezuela — Day 1 Caracas: museums, El Ávila, Altamira. Day 2–3 Mérida: cable car, paragliding, waterfalls. Day 4–5 Los Roques: snorkeling, beach, seafood..."`}
                className="w-full h-44 text-sm p-4 rounded-xl border-2 border-border bg-muted/30 resize-none focus:outline-none focus:border-amber-400/60 placeholder:text-muted-foreground/50 leading-relaxed transition-colors duration-150"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                {pasteText.length > 0
                  ? `${pasteText.length} characters — AI will process this`
                  : 'Any language, any format — AI will figure it out'}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={handleContinue}
                disabled={!pasteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50 hover:scale-[1.01] active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
              >
                Build my itinerary
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
