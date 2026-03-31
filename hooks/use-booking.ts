'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe/client';
import type { Booking, Listing } from '@/types/database';
import type { CreateBookingRequest } from '@/types/api';
import toast from 'react-hot-toast';

type BookingStep = 'select' | 'details' | 'payment' | 'confirmation';

export function useBooking(listing: Listing) {
  const router = useRouter();
  const [step, setStep] = useState<BookingStep>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<Partial<CreateBookingRequest>>({
    listing_id: listing.id,
    guests: listing.min_guests,
  });

  const updateFormData = (data: Partial<CreateBookingRequest>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    const steps: BookingStep[] = ['select', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: BookingStep[] = ['select', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const createBooking = async (): Promise<Booking | null> => {
    if (!formData.check_in) {
      toast.error('Please select a date');
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const { data } = await response.json();
      setBooking(data);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      let currentBooking = booking;

      if (!currentBooking) {
        currentBooking = await createBooking();
        if (!currentBooking) return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: currentBooking.id,
          success_url: `${window.location.origin}/bookings/${currentBooking.id}?success=true`,
          cancel_url: `${window.location.origin}/listing/${listing.slug}?cancelled=true`,
        }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const { checkout_url } = await response.json();
      window.location.href = checkout_url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPrice = (): number => {
    const guests = formData.guests || 1;
    return listing.price_usd * guests;
  };

  return {
    step,
    formData,
    booking,
    isLoading,
    updateFormData,
    nextStep,
    prevStep,
    setStep,
    createBooking,
    handlePayment,
    getTotalPrice,
  };
}
