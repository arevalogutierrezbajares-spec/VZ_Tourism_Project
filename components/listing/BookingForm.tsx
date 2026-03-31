'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { bookingSchema, type BookingFormData } from '@/lib/validators';
import type { Listing } from '@/types/database';
import { useAuth } from '@/hooks/use-auth';
import { useBooking } from '@/hooks/use-booking';
import { formatDate, pluralize } from '@/lib/utils';

interface BookingFormProps {
  listing: Listing;
}

export function BookingForm({ listing }: BookingFormProps) {
  const { isAuthenticated } = useAuth();
  const { step, formData, isLoading, updateFormData, nextStep, prevStep, handlePayment, getTotalPrice } =
    useBooking(listing);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateFormData({ check_in: date.toISOString().split('T')[0] });
    }
  };

  const steps = ['Select Date', 'Details', 'Payment'];
  const stepIndex = ['select', 'details', 'payment', 'confirmation'].indexOf(step);

  return (
    <Card className="shadow-xl sticky top-24">
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <PriceDisplay priceUsd={listing.price_usd} size="xl" />
          <span className="text-sm text-muted-foreground">per person</span>
        </div>

        {/* Step indicator */}
        {step !== 'confirmation' && (
          <div className="flex items-center gap-2 mt-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium transition-colors ${
                    i < stepIndex
                      ? 'bg-green-500 text-white'
                      : i === stepIndex
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${i === stepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <div className="w-4 h-px bg-muted-foreground/30" />}
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 'select' && (
          <>
            <AvailabilityCalendar
              listingId={listing.id}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
            <div className="space-y-2">
              <Label>Number of guests</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updateFormData({
                      guests: Math.max(listing.min_guests, (formData.guests || 1) - 1),
                    })
                  }
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium text-lg">
                  {formData.guests || listing.min_guests}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updateFormData({
                      guests: Math.min(listing.max_guests, (formData.guests || 1) + 1),
                    })
                  }
                >
                  +
                </Button>
                <span className="text-xs text-muted-foreground">
                  max {listing.max_guests}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!selectedDate}
              onClick={nextStep}
            >
              Continue
            </Button>
          </>
        )}

        {step === 'details' && (
          <>
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {selectedDate ? formatDate(selectedDate) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">
                  {pluralize(formData.guests || 1, 'guest')}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special requests (optional)</Label>
              <Textarea
                placeholder="Dietary requirements, accessibility needs, etc."
                rows={3}
                value={formData.special_requests || ''}
                onChange={(e) => updateFormData({ special_requests: e.target.value })}
                className="resize-none"
              />
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <PriceDisplay priceUsd={getTotalPrice()} size="lg" />
              </div>
              <p className="text-xs text-muted-foreground">
                {listing.cancellation_policy} cancellation policy applies
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                Back
              </Button>
              <Button className="flex-1" onClick={nextStep} disabled={!isAuthenticated}>
                {isAuthenticated ? 'Continue to payment' : 'Sign in to book'}
              </Button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Booking Summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedDate ? formatDate(selectedDate) : '-'} · {pluralize(formData.guests || 1, 'guest')}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <PriceDisplay priceUsd={getTotalPrice()} size="md" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              Secure payment via Stripe
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                Back
              </Button>
              <Button className="flex-1" onClick={handlePayment} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Pay now'}
              </Button>
            </div>
          </>
        )}

        {step === 'confirmation' && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-lg">Booking Confirmed!</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;ll receive a confirmation email and WhatsApp message shortly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
