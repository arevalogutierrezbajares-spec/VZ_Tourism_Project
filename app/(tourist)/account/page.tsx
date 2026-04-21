'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
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
  const { user, profile, loading, isAuthenticated } = useAuth();
  const [form, setForm] = useState<UserProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  // Password change state
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handlePasswordChange = async () => {
    if (pwForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Authentication is not configured');
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (!res.ok) throw new Error('Deletion request failed');
      toast.success('Account deletion request submitted. You will be signed out shortly.');
      setShowDeleteConfirm(false);
    } catch {
      toast.error('Could not process deletion request. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container px-4 py-16 max-w-md mx-auto text-center">
        <p className="text-lg font-medium mb-2 text-balance">Sign in to manage your account</p>
        <p className="text-sm text-muted-foreground mb-6 text-pretty">
          Your profile, preferences, and settings are available after signing in.
        </p>
        <a href="/login?next=/account" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-[opacity] active:scale-[0.96]">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="w-16 h-16 shadow-md outline outline-1 -outline-offset-1 outline-black/10">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {getInitials(profile?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold font-heading text-balance">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>
        </div>
        <Badge variant="secondary" className="ml-auto capitalize">{profile?.role}</Badge>
      </div>

      {!serviceAvailable && (
        <div className="mb-6 rounded-xl bg-accent/10 border border-accent/30 px-4 py-3 text-sm text-accent-foreground">
          Profile service is temporarily unavailable. Your changes cannot be saved right now.
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="acct-display-name" className="block text-sm font-medium mb-1">Display Name</Label>
              <Input
                id="acct-display-name"
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder={profile?.full_name ?? 'Your name'}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="acct-phone" className="block text-sm font-medium mb-1">Phone / WhatsApp</Label>
              <Input
                id="acct-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                autoComplete="tel"
              />
            </div>
            <div>
              <Label htmlFor="acct-country" className="block text-sm font-medium mb-1">Country</Label>
              <select
                id="acct-country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                autoComplete="country-name"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select country...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-2">Language</Label>
              <div className="flex gap-2">
                {(['en', 'es'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, language: lang }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-[color,background-color,border-color] ${
                      form.language === lang
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/60'
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
                      ? 'bg-accent border-accent text-accent-foreground'
                      : 'bg-background border-border hover:border-accent/50'
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
              <Label htmlFor="acct-emerg-name" className="block text-sm font-medium mb-1">Contact Name</Label>
              <Input
                id="acct-emerg-name"
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                placeholder="Full name"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="acct-emerg-phone" className="block text-sm font-medium mb-1">Contact Phone</Label>
              <Input
                id="acct-emerg-phone"
                type="tel"
                inputMode="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                placeholder="+1 555 000 0000"
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="acct-zelle" className="block text-sm font-medium mb-1">Zelle Email</Label>
              <Input
                id="acct-zelle"
                type="email"
                inputMode="email"
                value={form.payment_zelle_email}
                onChange={(e) => setForm((f) => ({ ...f, payment_zelle_email: e.target.value }))}
                placeholder="email@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="acct-usdt" className="block text-sm font-medium mb-1">USDT Wallet Address (TRC-20)</Label>
              <Input
                id="acct-usdt"
                type="text"
                value={form.payment_usdt_address}
                onChange={(e) => setForm((f) => ({ ...f, payment_usdt_address: e.target.value }))}
                placeholder="T..."
                autoComplete="off"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !serviceAvailable}
          className="w-full active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out"
          size="lg"
        >
          {saving ? 'Saving...' : !serviceAvailable ? 'Service unavailable' : 'Save changes'}
        </Button>

        {/* Change Password */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="acct-new-password" className="block text-sm font-medium mb-1">
                New Password
              </Label>
              <Input
                id="acct-new-password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="acct-confirm-password" className="block text-sm font-medium mb-1">
                Confirm New Password
              </Label>
              <Input
                id="acct-confirm-password"
                type="password"
                placeholder="Repeat new password"
                autoComplete="new-password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={pwSaving || !pwForm.newPassword}
              className="w-full active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out"
            >
              {pwSaving ? 'Updating...' : 'Update password'}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="rounded-xl shadow-sm border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-pretty">
                  Are you sure you want to delete your account? This action cannot be undone.
                  All your data, bookings, and preferences will be permanently removed.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Processing...' : 'Yes, delete my account'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 active:scale-[0.96] transition-[transform,color,background-color,border-color] duration-150 ease-out"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-pretty">
                  Permanently delete your account and all associated data.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full active:scale-[0.96] transition-[transform,color,background-color] duration-150 ease-out"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete my account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
