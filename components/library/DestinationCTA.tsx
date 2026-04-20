'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BuildItineraryModal } from '@/components/itinerary/BuildItineraryModal';

interface DestinationCTAProps {
  destinationName: string;
}

export function DestinationCTA({ destinationName }: DestinationCTAProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="bg-foreground text-background py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium text-accent tracking-widest uppercase mb-3">
            Ready to go?
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Plan your {destinationName} trip with AI
          </h2>
          <p className="text-background/60 mb-8 text-base leading-relaxed">
            Describe what you have in mind and our AI will put together a full day-by-day itinerary — activities, stays, and dining — tailored to your travel style.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base bg-accent text-accent-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all duration-200 overflow-hidden relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-foreground motion-reduce:hover:scale-100"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            Build my itinerary with AI
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent motion-reduce:hidden"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      <BuildItineraryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
