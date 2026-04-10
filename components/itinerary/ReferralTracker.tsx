'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface ReferralTrackerProps {
  itineraryId: string;
}

export function ReferralTracker({ itineraryId }: ReferralTrackerProps) {
  const searchParams = useSearchParams();
  const tracked = useRef(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref || tracked.current) return;
    tracked.current = true;

    fetch(`/api/itineraries/${itineraryId}/track-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_code: ref }),
    }).catch(() => {
      // Silent fail - referral tracking is non-critical
    });
  }, [searchParams, itineraryId]);

  return null;
}
