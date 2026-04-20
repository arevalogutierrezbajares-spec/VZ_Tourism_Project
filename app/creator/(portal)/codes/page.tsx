'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, PauseCircle, PlayCircle, Tag, Loader2 } from 'lucide-react';
import type { DiscountCode } from '@/types/database';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expired: 'bg-muted text-muted-foreground',
};

function suggestCode(username: string, count: number) {
  const base = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return `${base}${count + 1 < 10 ? `0${count + 1}` : count + 1}`;
}

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Profile for code suggestion
  const [username, setUsername] = useState('');

  const [form, setForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    expires_at: '',
  });

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discount-codes');
      if (res.ok) {
        const data = await res.json();
        setCodes(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
    // Fetch username for suggestion
    fetch('/api/creator/profile')
      .then((r) => r.json())
      .then((p) => {
        if (p.username) {
          setUsername(p.username);
          setForm((f) => ({ ...f, code: suggestCode(p.username, 0) }));
        }
      })
      .catch(() => {});
  }, [fetchCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          type: form.type,
          value: parseFloat(form.value),
          expires_at: form.expires_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not create code.');
        return;
      }
      setCodes((prev) => [data, ...prev]);
      setShowForm(false);
      setForm((f) => ({ ...f, code: suggestCode(username, codes.length + 1), value: '', expires_at: '' }));
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (code: DiscountCode) => {
    const newStatus = code.status === 'active' ? 'paused' : 'active';
    setToggling(code.id);
    try {
      const res = await fetch(`/api/discount-codes/${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCodes((prev) =>
          prev.map((c) => (c.id === code.id ? { ...c, status: newStatus } : c))
        );
      }
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share codes with your followers for a discount on bookings.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          New code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Create a new code</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))}
                placeholder="ADRIANA10"
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-1">3–15 uppercase letters/numbers</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value="percentage">% discount</option>
                <option value="fixed">Fixed USD off</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Value * {form.type === 'percentage' ? '(%)' : '(USD)'}
              </label>
              <input
                type="number"
                required
                min={0.01}
                max={form.type === 'percentage' ? 100 : undefined}
                step={form.type === 'percentage' ? 1 : 0.01}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === 'percentage' ? '10' : '20.00'}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expires (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="flex-1 bg-muted text-foreground text-sm font-medium py-2.5 rounded-xl hover:bg-muted/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] bg-primary text-primary-foreground text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create code'}
            </button>
          </div>
        </form>
      )}

      {/* Code list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading codes...
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Tag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No discount codes yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Create your first code →
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {codes.map((code) => (
            <div key={code.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{code.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[code.status]}`}>
                    {code.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {code.type === 'percentage' ? `${code.value}% off` : `$${code.value} off`}
                  {' · '}
                  {code.times_used} use{code.times_used !== 1 ? 's' : ''}
                  {code.max_uses ? ` / ${code.max_uses}` : ''}
                  {' · '}
                  ${code.total_revenue_generated.toFixed(0)} revenue
                  {code.expires_at && ` · expires ${new Date(code.expires_at).toLocaleDateString()}`}
                </div>
              </div>
              {code.status !== 'expired' && (
                <button
                  onClick={() => handleToggle(code)}
                  disabled={toggling === code.id}
                  aria-label={code.status === 'active' ? 'Pause code' : 'Activate code'}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {toggling === code.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : code.status === 'active' ? (
                    <PauseCircle className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
