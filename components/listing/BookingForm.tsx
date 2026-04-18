'use client';

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Users,
  User,
  Mail,
  Phone,
  MessageSquare,
  CreditCard,
  Banknote,
  CircleDollarSign,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Copy,
  Zap,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { AuthModal } from '@/components/common/AuthModal';
import type { Listing } from '@/types/database';
import { useBooking, type PaymentMethod } from '@/hooks/use-booking';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';

interface BookingFormProps {
  listing: Listing;
}

const STEP_LABELS = ['Dates', 'Your Info', 'Review', 'Payment'];

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  sublabel: string;
  icon: typeof CreditCard;
  badge?: string;
}[] = [
  {
    value: 'card',
    label: 'Credit / Debit Card',
    sublabel: 'Pay now via Stripe. Instant confirmation.',
    icon: CreditCard,
  },
  {
    value: 'zelle',
    label: 'Zelle',
    sublabel: 'US bank transfer. We verify within 1 hour.',
    icon: Banknote,
    badge: 'No fees',
  },
  {
    value: 'usdt',
    label: 'USDT (TRC-20)',
    sublabel: 'Stablecoin transfer. Zero fees.',
    icon: CircleDollarSign,
    badge: 'Zero fees',
  },
  {
    value: 'arrival',
    label: 'Pay on Arrival',
    sublabel: 'Reserve now, pay cash when you arrive.',
    icon: Clock,
  },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-semibold transition-colors ${
              i < current
                ? 'bg-green-500 text-white'
                : i === current
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`text-[10px] hidden sm:block ${
              i === current ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
          {i < total - 1 && <div className="w-3 h-px bg-muted-foreground/30 mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

function PriceSummary({
  listing,
  nights,
  guestCount,
  subtotal,
  fee,
  total,
}: {
  listing: Listing;
  nights: number;
  guestCount: number;
  subtotal: number;
  fee: number;
  total: number;
}) {
  return (
    <div className="text-sm space-y-1.5 border rounded-lg p-3 bg-muted/30">
      <div className="flex justify-between text-muted-foreground">
        <span>
          ${listing.price_usd.toFixed(2)} × {guestCount} guest{guestCount > 1 ? 's' : ''} × {nights}{' '}
          night{nights > 1 ? 's' : ''}
        </span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Service fee (12%)</span>
        <span>${fee.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1.5">
        <span>Total</span>
        <span>${total.toFixed(2)} USD</span>
      </div>
    </div>
  );
}

export function BookingForm({ listing }: BookingFormProps) {
  const {
    step,
    formData,
    isLoading,
    booking,
    paymentDetails,
    updateFormData,
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
  } = useBooking(listing);

  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Verified provider = instant book; otherwise = request to book
  const isInstantBook = listing.provider?.is_verified === true;

  // After auth succeeds: pre-fill form with profile data, then advance step
  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    const { profile } = useAuthStore.getState();
    if (profile) {
      updateFormData({
        guest_name: profile.full_name || '',
        guest_email: profile.email || '',
        guest_phone: profile.phone || '',
      });
    }
    nextStep();
  }, [nextStep, updateFormData]);

  // Gate on step 1 Continue — require auth before proceeding
  const handleContinueFromDates = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      nextStep();
    }
  };

  const stepIndex = ['select', 'details', 'review', 'payment', 'done'].indexOf(step);

  const handleRangeSelect = (checkIn: string, checkOut: string | null) => {
    if (checkIn) {
      updateFormData({ check_in: checkIn, check_out: checkOut ?? undefined });
    } else {
      updateFormData({ check_in: '', check_out: undefined });
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'EEE, MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const canProceedFromSelect = !!formData.check_in;
  const canProceedFromDetails = formData.guest_name?.trim() && formData.guest_email?.trim();

  // Called when tourist clicks "Book Now" or "Request to Book" from review step
  const handleBookNow = async () => {
    const created = await submitBooking();
    if (!created) return;
    if (isInstantBook) {
      nextStep(); // advance to 'payment'
    } else {
      // Request to book: skip payment, go directly to confirmation
      window.location.href = `/booking/confirmation?id=${created.id}`;
    }
  };

  // Called from payment step
  const handlePay = async () => {
    if (!booking) return;
    if (formData.payment_method === 'card') {
      await handleCardPayment(booking);
    } else if (
      formData.payment_method === 'zelle' ||
      formData.payment_method === 'usdt'
    ) {
      // Show payment details (already set by submitBooking), let user confirm
      // The button becomes "I've sent the payment"
      await handleManualPaymentConfirm(booking);
    } else {
      handleArrivalBooking(booking);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="shadow-xl sticky top-24">
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <PriceDisplay priceUsd={listing.price_usd} size="xl" />
          <span className="text-sm text-muted-foreground">per person / night</span>
        </div>

        {step !== 'done' && (
          <StepIndicator current={stepIndex} total={STEP_LABELS.length} />
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ─── STEP 1: Dates + Guests ─── */}
        {step === 'select' && (
          <>
            <AvailabilityCalendar
              listingId={listing.id}
              basePrice={listing.price_usd}
              onRangeSelect={handleRangeSelect}
            />

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm">
                <Users className="w-3.5 h-3.5" />
                Guests
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateFormData({
                      guest_count: Math.max(
                        listing.min_guests || 1,
                        formData.guest_count - 1
                      ),
                    })
                  }
                  disabled={formData.guest_count <= (listing.min_guests || 1)}
                >
                  −
                </Button>
                <span className="w-10 text-center font-semibold text-lg">
                  {formData.guest_count}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateFormData({
                      guest_count: Math.min(
                        listing.max_guests || 99,
                        formData.guest_count + 1
                      ),
                    })
                  }
                  disabled={formData.guest_count >= (listing.max_guests || 99)}
                >
                  +
                </Button>
                <span className="text-xs text-muted-foreground">
                  max {listing.max_guests || 99}
                </span>
              </div>
            </div>

            {formData.check_in && (
              <div className="text-sm text-muted-foreground p-2 bg-muted/40 rounded-lg">
                {getNights()} night{getNights() > 1 ? 's' : ''} · {formData.guest_count} guest
                {formData.guest_count > 1 ? 's' : ''} · <strong>${getTotal().toFixed(2)}</strong>
              </div>
            )}

            <Button className="w-full" disabled={!canProceedFromSelect} onClick={handleContinueFromDates}>
              {isAuthenticated ? 'Continue' : 'Continue — Sign in required'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        )}

        {/* ─── STEP 2: Guest Details ─── */}
        {step === 'details' && (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm" htmlFor="guest_name">
                  <User className="w-3.5 h-3.5" />
                  Full name *
                </Label>
                <Input
                  id="guest_name"
                  placeholder="Your full name"
                  value={formData.guest_name}
                  onChange={(e) => updateFormData({ guest_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm" htmlFor="guest_email">
                  <Mail className="w-3.5 h-3.5" />
                  Email *
                </Label>
                <Input
                  id="guest_email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.guest_email}
                  onChange={(e) => updateFormData({ guest_email: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm" htmlFor="guest_phone">
                  <Phone className="w-3.5 h-3.5" />
                  WhatsApp / Phone
                </Label>
                <Input
                  id="guest_phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.guest_phone || ''}
                  onChange={(e) => updateFormData({ guest_phone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-sm" htmlFor="special_requests">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Special requests
                </Label>
                <Textarea
                  id="special_requests"
                  placeholder="Dietary requirements, accessibility needs, etc."
                  rows={2}
                  className="resize-none"
                  value={formData.special_requests || ''}
                  onChange={(e) => updateFormData({ special_requests: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!canProceedFromDetails}
                onClick={nextStep}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ─── STEP 3: Review Order ─── */}
        {step === 'review' && (
          <>
            <div className="space-y-2 text-sm">
              <div className="font-semibold">{listing.title}</div>
              <div className="flex justify-between text-muted-foreground">
                <span>Check-in</span>
                <span className="font-medium text-foreground">{formatDate(formData.check_in)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Check-out</span>
                <span className="font-medium text-foreground">
                  {formatDate(formData.check_out || formData.check_in)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Guests</span>
                <span className="font-medium text-foreground">
                  {formData.guest_count} guest{formData.guest_count > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground border-t pt-2 mt-1">
                <span>Guest</span>
                <span className="font-medium text-foreground">{formData.guest_name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Email</span>
                <span className="font-medium text-foreground">{formData.guest_email}</span>
              </div>
              {formData.guest_phone && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Phone</span>
                  <span className="font-medium text-foreground">{formData.guest_phone}</span>
                </div>
              )}
            </div>

            <PriceSummary
              listing={listing}
              nights={getNights()}
              guestCount={formData.guest_count}
              subtotal={getSubtotal()}
              fee={getServiceFee()}
              total={getTotal()}
            />

            {listing.cancellation_policy && (
              <p className="text-xs text-muted-foreground">
                {listing.cancellation_policy} cancellation policy applies.
              </p>
            )}

            {/* Booking mode indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              isInstantBook
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}>
              {isInstantBook ? (
                <><Zap className="w-3.5 h-3.5 flex-shrink-0" /> Instant confirmation — pay now</>
              ) : (
                <><Send className="w-3.5 h-3.5 flex-shrink-0" /> Provider confirms within 24h — no payment now</>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button className="flex-1" onClick={handleBookNow} disabled={isLoading}>
                {isLoading
                  ? (isInstantBook ? 'Reserving...' : 'Sending request...')
                  : isInstantBook
                  ? 'Book Now'
                  : 'Request to Book'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ─── STEP 4: Payment Method ─── */}
        {step === 'payment' && (
          <>
            <div>
              <p className="text-sm font-semibold mb-2">Choose payment method</p>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = formData.payment_method === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateFormData({ payment_method: opt.value })}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div
                        className={`mt-0.5 p-1.5 rounded-md ${selected ? 'bg-primary text-white' : 'bg-muted'}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{opt.label}</span>
                          {opt.badge && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{opt.sublabel}</p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                          selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual payment details (Zelle / USDT) */}
            {paymentDetails &&
              (formData.payment_method === 'zelle' || formData.payment_method === 'usdt') && (
                <div className="border rounded-lg p-3 bg-blue-50 space-y-2 text-sm">
                  <p className="font-semibold text-blue-800">Send payment to:</p>
                  {paymentDetails.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Email (Zelle)</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-medium">{paymentDetails.email}</span>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.email!)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copied ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  {paymentDetails.address && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">USDT Address</span>
                        <span className="text-xs text-muted-foreground">
                          {paymentDetails.network}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs break-all">{paymentDetails.address}</span>
                        <button
                          onClick={() => copyToClipboard(paymentDetails.address!)}
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          {copied ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <span>Amount</span>
                    <span>{paymentDetails.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memo / Reference</span>
                    <span className="font-mono font-semibold">{paymentDetails.reference}</span>
                  </div>
                  <p className="text-xs text-blue-700 border-t border-blue-200 pt-2">
                    {paymentDetails.instructions}
                  </p>
                </div>
              )}

            <PriceSummary
              listing={listing}
              nights={getNights()}
              guestCount={formData.guest_count}
              subtotal={getSubtotal()}
              fee={getServiceFee()}
              total={getTotal()}
            />

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/3" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button className="flex-1" onClick={handlePay} disabled={isLoading}>
                {isLoading
                  ? 'Processing...'
                  : formData.payment_method === 'card'
                  ? `Pay $${getTotal().toFixed(2)}`
                  : formData.payment_method === 'arrival'
                  ? 'Confirm Reservation'
                  : "I've Sent the Payment"}
              </Button>
            </div>
          </>
        )}

        {/* ─── DONE ─── */}
        {step === 'done' && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-lg">Booking Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Redirecting to your confirmation page…
            </p>
          </div>
        )}
      </CardContent>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title="Sign in to book"
        subtitle="We need your account to process payment and send your confirmation."
      />
    </Card>
  );
}
