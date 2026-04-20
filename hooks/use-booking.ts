'use client';

import { useState } from 'react';
import type { Listing } from '@/types/database';
import toast from 'react-hot-toast';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';

export type BookingStep = 'select' | 'details' | 'review' | 'payment' | 'done';
export type PaymentMethod = 'card' | 'zelle' | 'usdt' | 'arrival';

export interface BookingFormData {
  listing_id: string;
  check_in: string;
  check_out?: string;
  guest_count: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  special_requests?: string;
  payment_method: PaymentMethod;
  discount_code_id?: string;
}

export interface PaymentDetails {
  method: string;
  email?: string;
  name?: string;
  address?: string;
  network?: string;
  amount: string;
  reference: string;
  instructions: string;
}

export interface CreatedBooking {
  id: string;
  confirmation_code: string;
  total_usd: number;
  status: string;
  [key: string]: unknown;
}

export function useBooking(listing: Listing) {
  const [step, setStep] = useState<BookingStep>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState<CreatedBooking | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    listing_id: listing.id,
    check_in: '',
    check_out: '',
    guest_count: listing.min_guests || 1,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
    payment_method: 'card',
  });

  const updateFormData = (data: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const steps: BookingStep[] = ['select', 'details', 'review', 'payment', 'done'];

  const nextStep = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  // Price calculation
  const getNights = (): number => {
    if (!formData.check_in) return 1;
    const checkIn = new Date(formData.check_in);
    const checkOut = formData.check_out ? new Date(formData.check_out) : checkIn;
    return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getSubtotal = (): number => {
    return listing.price_usd * formData.guest_count * getNights();
  };

  const getServiceFee = (): number => {
    return Math.round(getSubtotal() * PLATFORM_COMMISSION_RATE * 100) / 100;
  };

  const getTotal = (): number => {
    return Math.round((getSubtotal() + getServiceFee()) * 100) / 100;
  };

  const submitBooking = async (): Promise<CreatedBooking | null> => {
    if (!formData.check_in) {
      toast.error('Please select a check-in date');
      return null;
    }
    if (!formData.guest_name.trim()) {
      toast.error('Please enter your name');
      return null;
    }
    if (!formData.guest_email.trim()) {
      toast.error('Please enter your email');
      return null;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          guests: formData.guest_count,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.error === 'string' ? err.error : 'Failed to create booking'
        );
      }

      const result = await res.json();
      setBooking(result.data);
      if (result.checkout_url) setCheckoutUrl(result.checkout_url);
      if (result.payment_details) setPaymentDetails(result.payment_details);
      return result.data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardPayment = async (currentBooking: CreatedBooking) => {
    // If we already have a checkout URL from booking creation, use it
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }
    // Otherwise request a new checkout session
    setIsLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: currentBooking.id }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualPaymentConfirm = async (currentBooking: CreatedBooking) => {
    // Mark as payment_submitted for Zelle/USDT
    setIsLoading(true);
    try {
      await fetch(`/api/bookings/${currentBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'payment_submitted' }),
      });
      window.location.href = `/booking/confirmation?id=${currentBooking.id}`;
    } catch {
      // Still redirect even if patch fails
      window.location.href = `/booking/confirmation?id=${currentBooking.id}`;
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrivalBooking = (currentBooking: CreatedBooking) => {
    window.location.href = `/booking/confirmation?id=${currentBooking.id}`;
  };

  return {
    step,
    setStep,
    formData,
    updateFormData,
    isLoading,
    booking,
    checkoutUrl,
    paymentDetails,
    nextStep,
    prevStep,
    getNights,
    getSubtotal,
    getServiceFee,
    getTotal,
    submitBooking,
    handleCardPayment,
    handleManualPaymentConfirm,
    handleArrivalBooking,
  };
}
