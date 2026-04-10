'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mail, CheckCircle } from 'lucide-react';

interface BookingInterestModalProps {
  itineraryTitle: string;
  open: boolean;
  onClose: () => void;
}

export function BookingInterestModal({ itineraryTitle, open, onClose }: BookingInterestModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // For now, just simulate success. The booking_interests table is v2.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-lg font-bold">You're on the list!</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you as soon as booking opens for this itinerary.
            </p>
            <Button onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Booking coming soon</h3>
              <p className="text-sm text-muted-foreground">
                Direct booking for "{itineraryTitle}" is launching soon. Leave your email to be first in line.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? 'Saving...' : 'Notify Me When Booking Opens'}
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center">
              No spam. Just one email when booking goes live.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
