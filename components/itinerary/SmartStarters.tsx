'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Waves,
  Mountain,
  Droplets,
  UtensilsCrossed,
  Building2,
  TreePine,
} from 'lucide-react';

interface SmartStartersProps {
  onSend: (message: string) => void;
  className?: string;
}

const VIBES = [
  { id: 'beach', label: 'Beach & Chill', icon: Waves, prompt: 'beach and relaxation' },
  { id: 'mountain', label: 'Mountain Adventure', icon: Mountain, prompt: 'mountain adventure and hiking' },
  { id: 'falls', label: 'Angel Falls', icon: Droplets, prompt: 'visiting Angel Falls and Canaima' },
  { id: 'food', label: 'Food & Culture', icon: UtensilsCrossed, prompt: 'food, culture, and local experiences' },
  { id: 'city', label: 'City & Nightlife', icon: Building2, prompt: 'city exploration and nightlife' },
  { id: 'nature', label: 'Nature & Wildlife', icon: TreePine, prompt: 'nature, wildlife, and eco-tours' },
] as const;

const DURATIONS = [
  { days: 3, label: '3 days' },
  { days: 5, label: '5 days' },
  { days: 7, label: '1 week' },
  { days: 10, label: '10 days' },
] as const;

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] } },
};

export function SmartStarters({ onSend, className }: SmartStartersProps) {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  const handleVibeClick = (vibeId: string, prompt: string) => {
    setSelectedVibe(vibeId);
    // If duration already selected, auto-send
    if (selectedDays) {
      onSend(`I want a ${selectedDays}-day trip focused on ${prompt} in Venezuela.`);
      return;
    }
  };

  const handleDurationClick = (days: number) => {
    setSelectedDays(days);
    // If vibe already selected, auto-send
    if (selectedVibe) {
      const vibe = VIBES.find((v) => v.id === selectedVibe);
      if (vibe) {
        onSend(`I want a ${days}-day trip focused on ${vibe.prompt} in Venezuela.`);
        return;
      }
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-muted-foreground">What kind of trip?</p>

      {/* Vibe cards */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {VIBES.map((vibe) => {
          const Icon = vibe.icon;
          const isSelected = selectedVibe === vibe.id;
          return (
            <motion.button
              key={vibe.id}
              type="button"
              variants={staggerItem}
              onClick={() => handleVibeClick(vibe.id, vibe.prompt)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-[border-color,background-color,color] duration-150 text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.96]',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isSelected && 'text-primary')} />
              <span className="text-xs font-medium leading-tight">{vibe.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Duration chips */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">How long?</p>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.days}
              type="button"
              onClick={() => handleDurationClick(d.days)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-[border-color,background-color,color] duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                selectedDays === d.days
                  ? 'bg-primary text-white border-primary'
                  : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
