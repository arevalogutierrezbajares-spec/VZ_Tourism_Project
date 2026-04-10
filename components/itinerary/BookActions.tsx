'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookingInterestModal } from './BookingInterestModal';

interface BookActionsProps {
  itineraryId: string;
  itineraryTitle: string;
}

export function BookActions({ itineraryId, itineraryTitle }: BookActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleCustomize = async () => {
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/clone`, { method: 'POST' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) return;
      const { id } = await res.json();
      router.push(`/itinerary/${id}`);
    } catch {
      // silent fail
    }
  };

  return (
    <>
      <div className="flex gap-3 pt-2">
        <Button size="lg" className="font-semibold" onClick={() => setShowModal(true)}>
          Book This Trip
        </Button>
        <Button size="lg" variant="outline" onClick={handleCustomize}>
          Customize
        </Button>
      </div>
      <BookingInterestModal
        itineraryTitle={itineraryTitle}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
