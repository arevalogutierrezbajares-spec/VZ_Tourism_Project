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
      <section className="bg-gray-950 text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium text-amber-400 tracking-widest uppercase mb-3">
            Ready to go?
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Plan your {destinationName} trip with AI
          </h2>
          <p className="text-gray-400 mb-8 text-base leading-relaxed">
            Describe what you have in mind and our AI will put together a full day-by-day itinerary — activities, stays, and dining — tailored to your travel style.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-400/30 hover:scale-105 active:scale-100 transition-all duration-200 overflow-hidden relative"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            Build my itinerary with AI
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent"
              aria-hidden
            />
          </button>
        </div>
      </section>

      <BuildItineraryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
