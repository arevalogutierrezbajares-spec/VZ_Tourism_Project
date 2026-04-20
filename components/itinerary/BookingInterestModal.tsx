'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="relative bg-background rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)] max-w-md w-full p-6 space-y-4"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.96] transition-[color,background-color,transform] duration-150"
            >
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-4 space-y-3"
                >
                  <motion.div
                    initial={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
                    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  >
                    <CheckCircle className="w-12 h-12 text-primary mx-auto" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-balance">You&apos;re on the list!</h3>
                  <p className="text-sm text-muted-foreground text-pretty">
                    We&apos;ll notify you as soon as booking opens for this itinerary.
                  </p>
                  <Button onClick={onClose} className="mt-2 active:scale-[0.96] transition-[transform] duration-150">Done</Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-balance">Booking coming soon</h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Direct booking for &ldquo;{itineraryTitle}&rdquo; is launching soon. Leave your email to be first in line.
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
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-[box-shadow,border-color] duration-200"
                      />
                    </div>
                    <Button type="submit" className="w-full active:scale-[0.96] transition-[transform] duration-150" disabled={loading || !email}>
                      {loading ? 'Saving...' : 'Notify Me When Booking Opens'}
                    </Button>
                  </form>

                  <p className="text-[11px] text-muted-foreground text-center">
                    No spam. Just one email when booking goes live.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
