'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const COUNTRIES = [
  'United States', 'Venezuela', 'Colombia', 'Brazil', 'Argentina', 'Mexico',
  'Spain', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy',
  'Portugal', 'Netherlands', 'Australia', 'Japan', 'Other',
];

const INTERESTS = [
  { value: 'beaches', label: 'Beaches' },
  { value: 'mountains', label: 'Mountains' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'family', label: 'Family' },
  { value: 'wellness', label: 'Wellness' },
];

interface UserProfile {
  display_name: string;
  phone: string;
  country: string;
  language: string;
  interests: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  payment_zelle_email: string;
  payment_usdt_address: string;
}

const EMPTY_PROFILE: UserProfile = {
  display_name: '',
  phone: '',
  country: '',
  language: 'en',
  interests: [],
  emergency_contact_name: '',
  emergency_contact_phone: '',
  payment_zelle_email: '',
  payment_usdt_address: '',
};

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, isAuthenticated } = useAuth();
  const [form, setForm] = useState<UserProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/profile')
      .then((r) => {
        if (r.status === 503) { setServiceAvailable(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data?.profile) return;
        const p = data.profile;
        setForm({
          display_name: p.display_name ?? profile?.full_name ?? '',
          phone: p.phone ?? '',
          country: p.country ?? '',
          language: p.language ?? 'en',
          interests: p.interests ?? [],
          emergency_contact_name: p.emergency_contact_name ?? '',
          emergency_contact_phone: p.emergency_contact_phone ?? '',
          payment_zelle_email: p.payment_zelle_email ?? '',
          payment_usdt_address: p.payment_usdt_address ?? '',
        });
      })
      .catch(() => setServiceAvailable(false));
  }, [isAuthenticated, profile]);

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const toggleInterest = (value: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((i) => i !== value)
        : [...f.interests, value],
    }));
  };

  const handleSave = async () => {
    if (!serviceAvailable) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Profile saved!');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="container px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="w-16 h-16 shadow-md">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xl bg-sky-500 text-white">
            {getInitials(profile?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>
        </div>
        <Badge variant="secondary" className="ml-auto capitalize">{profile?.role}</Badge>
      </div>

      {!serviceAvailable && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Profile service is temporarily unavailable. Your changes cannot be saved right now.
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder={profile?.full_name ?? 'Your name'}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone / WhatsApp</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <div className="flex gap-2">
                {(['en', 'es'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, language: lang }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.language === lang
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-white text-muted-foreground border-border hover:border-sky-400'
                    }`}
                  >
                    {lang === 'en' ? 'English' : 'Español'}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Interests */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Travel Interests</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INTERESTS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleInterest(value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors text-left ${
                    form.interests.includes(value)
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'bg-white border-border hover:border-amber-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Zelle Email</label>
              <input
                type="email"
                value={form.payment_zelle_email}
                onChange={(e) => setForm((f) => ({ ...f, payment_zelle_email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">USDT Wallet Address (TRC-20)</label>
              <input
                type="text"
                value={form.payment_usdt_address}
                onChange={(e) => setForm((f) => ({ ...f, payment_usdt_address: e.target.value }))}
                placeholder="T..."
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !serviceAvailable}
          className="w-full rounded-xl bg-sky-500 text-white py-3 text-sm font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : !serviceAvailable ? 'Service unavailable' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
