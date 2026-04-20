'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookingInterestModal } from './BookingInterestModal';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface BookActionsProps {
  itineraryId: string;
  itineraryTitle: string;
}

export function BookActions({ itineraryId, itineraryTitle }: BookActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const [cloneState, setCloneState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const router = useRouter();

  const handleCustomize = async () => {
    setCloneState('loading');
    setCloneError(null);
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/clone`, { method: 'POST' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 429) {
        setCloneState('error');
        setCloneError('Too many copies. Please try again later.');
        return;
      }
      if (!res.ok) {
        setCloneState('error');
        setCloneError('Failed to create copy. Please try again.');
        return;
      }
      const { id } = await res.json();
      setCloneState('success');
      setTimeout(() => {
        router.push(`/itinerary/${id}`);
      }, 800);
    } catch {
      setCloneState('error');
      setCloneError('Network error. Please check your connection.');
    }
  };

  return (
    <>
      <div className="flex gap-3 pt-2">
        <Button size="lg" className="font-semibold cursor-pointer" onClick={() => setShowModal(true)}>
          Book This Trip
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleCustomize}
          disabled={cloneState === 'loading' || cloneState === 'success'}
          className="cursor-pointer"
        >
          {cloneState === 'loading' && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
          {cloneState === 'success' && <CheckCircle className="w-4 h-4 mr-1.5 text-green-500" />}
          {cloneState === 'success' ? 'Copied!' : 'Customize'}
        </Button>
      </div>
      {cloneState === 'error' && cloneError && (
        <div className="flex items-center gap-2 mt-2 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{cloneError}</span>
        </div>
      )}
      <BookingInterestModal
        itineraryTitle={itineraryTitle}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
