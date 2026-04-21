'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { MapPin, Zap, TrendingUp, Link2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface InviteData {
  invited_name: string | null;
  email: string | null;
  expires_at: string;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function CreatorInvitePage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/creator/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); } else {
          setInvite(data);
          if (data.email) setEmail(data.email);
        }
        setLoading(false);
      })
      .catch(() => { setError('Could not load invite.'); setLoading(false); });
  }, [token]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/creator/invite/${token}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      // Account created — now sign in to establish a browser session
      const supabase = createClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setFormError('Account created but sign-in failed. Please sign in at /auth/login.');
          setSubmitting(false);
          return;
        }
      }

      router.push(data.redirectUrl);
    } catch {
      setFormError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading invite">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none motion-reduce:opacity-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Invite not valid</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const firstName = invite?.invited_name?.split(' ')[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b px-6 py-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm">Vamos a Venezuela</span>
      </div>

      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Invite headline */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 bg-status-pending/10 text-status-pending text-xs font-medium px-3 py-1 rounded-full mb-4 border border-status-pending/30">
            Creator Invite — Exclusive Access
          </div>
          <h1 className="text-3xl font-heading font-bold leading-tight text-balance">
            {firstName ? `${firstName}, you're invited to the VAV Creator Program` : "You're invited to the VAV Creator Program"}
          </h1>
          <p className="mt-3 text-muted-foreground text-sm text-pretty">
            Turn your Venezuela travel content into a curated booking link your followers can actually use. One link in your bio. Every stop bookable.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {[
            {
              icon: Link2,
              title: 'One link in your bio',
              body: 'vzvz.app/creator/you — your curated Venezuela itinerary, every stop bookable.',
            },
            {
              icon: Zap,
              title: 'Paste a TikTok link, get an itinerary',
              body: 'AI extracts every location from your videos and matches them to real bookable posadas and tours.',
            },
            {
              icon: TrendingUp,
              title: 'Earn 8% on every booking',
              body: 'When a follower books through your link, you earn. Tracked automatically, paid monthly.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-2xl border bg-card">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign-up form */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-heading font-semibold text-base mb-4">Claim your invite</h2>
          <form onSubmit={handleClaim} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Choose a password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Creating your account...' : 'Claim your invite →'}
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Invite-only. By claiming, you agree to our creator terms.
          </p>
        </div>
      </div>
    </div>
  );
}
