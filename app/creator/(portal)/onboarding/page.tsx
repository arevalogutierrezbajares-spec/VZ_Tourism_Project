'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, User, Link2, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NICHE_OPTIONS = [
  'Adventure', 'Beaches', 'Mountains', 'Food & Gastronomy',
  'Eco Travel', 'Photography', 'Budget Travel', 'Luxury',
  'Wildlife', 'Cultural', 'Road Trips', 'Diving',
];

interface WizardState {
  display_name: string;
  bio: string;
  username: string;
  instagram_handle: string;
  tiktok_handle: string;
  youtube_handle: string;
  website_url: string;
  niche_tags: string[];
}

const INITIAL: WizardState = {
  display_name: '',
  bio: '',
  username: '',
  instagram_handle: '',
  tiktok_handle: '',
  youtube_handle: '',
  website_url: '',
  niche_tags: [],
};

// Minimal inline preview component used only in Step 3
function ProfilePreview({ state }: { state: WizardState }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm max-w-sm mx-auto">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
          {state.display_name ? state.display_name[0].toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{state.display_name || 'Your Name'}</p>
          <p className="text-xs text-muted-foreground">@{state.username || 'username'}</p>
          {state.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{state.bio}</p>}
        </div>
      </div>
      {state.niche_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {state.niche_tags.map((t) => (
            <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
      <div className="text-xs text-primary font-medium">
        vzvz.app/creator/{state.username || 'username'}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: keyof WizardState, value: string | string[]) =>
    setState((s) => ({ ...s, [field]: value }));

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    try {
      const supabase = createClient();
      if (!supabase) { setUsernameStatus('available'); return; }
      const { data } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    } catch {
      setUsernameStatus('idle');
    }
  }, []);

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    update('username', clean);
    setUsernameStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkUsername(clean), 600);
  };

  const toggleNiche = (tag: string) => {
    setState((s) => {
      if (s.niche_tags.includes(tag)) {
        return { ...s, niche_tags: s.niche_tags.filter((t) => t !== tag) };
      }
      if (s.niche_tags.length >= 3) return s;
      return { ...s, niche_tags: [...s.niche_tags, tag] };
    });
  };

  const canAdvanceStep1 =
    state.display_name.trim().length >= 2 &&
    state.username.length >= 3 &&
    usernameStatus === 'available';

  const canGoLive =
    state.display_name.trim().length >= 2 &&
    state.username.length >= 3 &&
    usernameStatus === 'available';

  const handleGoLive = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: state.display_name,
          bio: state.bio,
          username: state.username,
          instagram_handle: state.instagram_handle || null,
          tiktok_handle: state.tiktok_handle || null,
          youtube_handle: state.youtube_handle || null,
          website_url: state.website_url || null,
          niche_tags: state.niche_tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not save profile.');
        setSubmitting(false);
        return;
      }
      router.push('/creator/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  const steps = [
    { label: 'Profile', icon: User },
    { label: 'Social', icon: Link2 },
    { label: 'Preview', icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress header */}
      <div className="border-b px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {steps.map(({ label }, i) => {
            const num = i + 1;
            const done = step > num;
            const active = step === num;
            return (
              <div key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/15 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground'}`}>
                  {done ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <span aria-label={`Step ${num}`}>{num}</span>}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-1" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="max-w-lg w-full">

          {/* ─── Step 1: Profile ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Set up your profile</h1>
                <p className="text-sm text-muted-foreground mt-1">This is what followers see when they click your link.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Display name *</label>
                <input
                  type="text"
                  value={state.display_name}
                  onChange={(e) => update('display_name', e.target.value)}
                  placeholder="Adriana Betancourt"
                  maxLength={60}
                  className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Bio <span className="opacity-60">({state.bio.length}/150)</span>
                </label>
                <textarea
                  value={state.bio}
                  onChange={(e) => update('bio', e.target.value.slice(0, 150))}
                  placeholder="Venezuela travel creator. I find the spots you won't see in a guidebook."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Username *{' '}
                  <span className="font-mono text-primary">vzvz.app/creator/{state.username || '...'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={state.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="adriana"
                    className={`w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 transition-colors
                      ${usernameStatus === 'taken' ? 'border-destructive focus:ring-destructive/50' : usernameStatus === 'available' ? 'border-status-confirmed focus:ring-status-confirmed/50' : 'focus:ring-primary/50 focus:border-primary'}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                    {usernameStatus === 'checking' && <span className="text-muted-foreground" role="status" aria-live="polite">checking...</span>}
                    {usernameStatus === 'taken' && <span className="text-destructive">taken</span>}
                    {usernameStatus === 'available' && <span className="text-status-confirmed">available ✓</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="w-full bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ─── Step 2: Social ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Link your socials</h1>
                <p className="text-sm text-muted-foreground mt-1">Optional. Adds social links to your public creator profile.</p>
              </div>

              {[
                { key: 'instagram_handle' as const, label: 'Instagram', placeholder: '@adriana' },
                { key: 'tiktok_handle' as const, label: 'TikTok', placeholder: '@adriana.ve' },
                { key: 'youtube_handle' as const, label: 'YouTube', placeholder: '@adrianatravel' },
                { key: 'website_url' as const, label: 'Website', placeholder: 'https://adrianatravel.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                  <input
                    type={key === 'website_url' ? 'url' : 'text'}
                    value={state[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Niche tags <span className="opacity-60">(pick up to 3)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {NICHE_OPTIONS.map((tag) => {
                    const selected = state.niche_tags.includes(tag);
                    const disabled = !selected && state.niche_tags.length >= 3;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleNiche(tag)}
                        disabled={disabled}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                          ${selected ? 'bg-primary text-primary-foreground border-primary' : disabled ? 'bg-muted text-muted-foreground/50 border-transparent cursor-not-allowed' : 'bg-background text-foreground hover:bg-muted border-border'}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-muted text-foreground font-medium text-sm py-3 rounded-lg hover:bg-muted/80 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Preview your profile →
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Preview ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Your creator profile</h1>
                <p className="text-sm text-muted-foreground mt-1">This is what followers see at your link. Ready to go live?</p>
              </div>

              <ProfilePreview state={state} />

              {error && (
                <p role="alert" className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-muted text-foreground font-medium text-sm py-3 rounded-lg hover:bg-muted/80 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ← Edit
                </button>
                <button
                  onClick={handleGoLive}
                  disabled={submitting || !canGoLive}
                  className="flex-[2] bg-primary text-primary-foreground font-medium text-sm py-3 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? 'Going live...' : 'Go live →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
