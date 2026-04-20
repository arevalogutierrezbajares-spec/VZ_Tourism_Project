'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, SlidersHorizontal, Download, Plus, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, X, Check, Sparkles, Edit2, Archive,
  Star, AlertTriangle, Tag, FileText, Loader2, Eye, RefreshCw,
  Command, Zap, MoreHorizontal, CheckSquare, Square,
  MessageCircle, AtSign, Mail, Send, Link2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: string;
  description: string;
  region: string;
  city: string;
  address: string;
  avg_rating: number | null;
  review_count: number;
  status: string;
  platform_status?: string;
  featured?: boolean;
  cover_image_url: string | null;
  phone: string | null;
  website: string | null;
  instagram_handle: string | null;
  google_place_id: string | null;
  category_tags: string[];
  price_level?: string;
  derivedCategory?: string;
  latitude?: number;
  longitude?: number;
}

type SortDir = 'asc' | 'desc';

interface Toast { msg: string; type: 'success' | 'error' | 'info' }

interface BulkPreview {
  changes: Array<{ id: string; name: string; before: Listing; after: Listing }>;
  action: string;
  value?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const REGIONS = ['caracas', 'margarita', 'merida', 'los-roques', 'canaima', 'gran-sabana', 'other'];
const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'hotels', label: 'Hotels & Stays' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'experiences', label: 'Experiences' },
  { value: 'other', label: 'Other' },
];
const STATUSES = ['all', 'published', 'draft', 'featured', 'archived'];
const PLATFORM_STATUSES = [
  { value: 'all', label: 'All Platform Status' },
  { value: 'scraped', label: 'Scraped' },
  { value: 'outreach_sent', label: 'Outreach Sent' },
  { value: 'interested', label: 'Interested' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'verified', label: 'Verified' },
  { value: 'founding_partner', label: 'Founding Partner' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function missingDataWarnings(l: Listing): string[] {
  const w: string[] = [];
  if (!l.description || l.description.length < 30) w.push('description');
  if (!l.category_tags || l.category_tags.length === 0) w.push('tags');
  if (!l.phone) w.push('phone');
  if (!l.cover_image_url) w.push('photo');
  return w;
}

function statusBadge(status: string) {
  const classMap: Record<string, string> = {
    published: 'bg-status-confirmed/10 text-status-confirmed',
    featured: 'bg-primary/10 text-primary',
    draft: 'bg-status-pending/10 text-status-pending',
    archived: 'bg-muted text-muted-foreground',
  };
  const cls = classMap[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function platformStatusBadge(ps: string | undefined) {
  const s = ps || 'scraped';
  const map: Record<string, { cls: string; label: string }> = {
    scraped:          { cls: 'bg-muted text-muted-foreground',                         label: 'Scraped' },
    outreach_sent:    { cls: 'bg-status-pending/10 text-status-pending',               label: 'Outreach Sent' },
    interested:       { cls: 'bg-primary/10 text-primary',                             label: 'Interested' },
    onboarding:       { cls: 'bg-status-payment-submitted/10 text-status-payment-submitted', label: 'Onboarding' },
    verified:         { cls: 'bg-status-confirmed/10 text-status-confirmed',           label: '✅ Verified' },
    founding_partner: { cls: 'bg-status-completed/10 text-status-completed',           label: '🏆 Founding' },
  };
  const style = map[s] || map.scraped;
  return (
    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${style.cls}`}>
      {style.label}
    </span>
  );
}

// ─── AI Row Popover ───────────────────────────────────────────────────────────

function AIRowPopover({
  listing,
  onAction,
  onClose,
}: {
  listing: Listing;
  onAction: (action: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute z-50 right-0 top-8 bg-background rounded-xl shadow-xl border border-border p-1 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
    >
      {[
        { action: 'generate_description', icon: FileText, label: 'Generate Description' },
        { action: 'improve_name', icon: Edit2, label: 'Improve Name' },
        { action: 'generate_tags', icon: Tag, label: 'Suggest Tags' },
        { action: 'auto_categorize', icon: RefreshCw, label: 'Auto-Categorize' },
      ].map(({ action, icon: Icon, label }) => (
        <button
          key={action}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
          onClick={() => { onAction(action); onClose(); }}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────

function EditPanel({
  listing,
  onClose,
  onSave,
}: {
  listing: Listing;
  onClose: () => void;
  onSave: (updated: Listing) => void;
}) {
  const [form, setForm] = useState<Listing>({ ...listing });
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [descDiff, setDescDiff] = useState<{ original: string; improved: string } | null>(null);
  const [tagInput, setTagInput] = useState('');

  const update = (field: keyof Listing, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) onSave(data.listing);
    } finally {
      setSaving(false);
    }
  }

  async function improveDescription() {
    setAiLoading('description');
    try {
      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve_description', listing: form }),
      });
      const data = await res.json();
      setDescDiff({ original: form.description, improved: data.improved });
    } finally {
      setAiLoading(null);
    }
  }

  async function generateTags() {
    setAiLoading('tags');
    try {
      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_tags', listing: form }),
      });
      const data = await res.json();
      setForm((f) => ({ ...f, category_tags: data.tags }));
    } finally {
      setAiLoading(null);
    }
  }

  async function autoCategorize() {
    setAiLoading('category');
    try {
      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_categorize', listing: form }),
      });
      const data = await res.json();
      setForm((f) => ({ ...f, type: data.type, category: data.type }));
    } finally {
      setAiLoading(null);
    }
  }

  const warnings = missingDataWarnings(listing);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col shadow-2xl bg-background border-l border-border"
      style={{ width: 480 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground text-sm truncate max-w-[320px]">{listing.name}</h2>
          <p className="text-xs text-muted-foreground capitalize">{listing.type} · {listing.region}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close edit panel"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-800">Missing: {warnings.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Photo */}
      {form.cover_image_url && (
        <div className="mx-5 mt-4 rounded-xl overflow-hidden" style={{ height: 140 }}>
          <img src={form.cover_image_url} alt={form.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="edit-name" className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
          <input
            id="edit-name"
            className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        {/* Type / Status row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <button
                onClick={autoCategorize}
                disabled={!!aiLoading}
                className="text-2xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                {aiLoading === 'category' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI
              </button>
            </div>
            <input
              className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
            <select
              className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {['published', 'draft', 'featured', 'archived'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Region / City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Region</label>
            <select
              className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
            >
              {REGIONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
            <input
              className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={form.city || ''}
              onChange={(e) => update('city', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <button
              onClick={improveDescription}
              disabled={!!aiLoading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium transition-colors bg-primary/10 text-primary"
            >
              {aiLoading === 'description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              ✨ Improve with AI
            </button>
          </div>
          {descDiff ? (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <div className="text-2xs text-status-cancelled font-medium mb-1">BEFORE</div>
                <p className="text-xs text-muted-foreground">{descDiff.original}</p>
              </div>
              <div className="p-3 rounded-lg bg-status-confirmed/5 border border-status-confirmed/20">
                <div className="text-2xs text-status-confirmed font-medium mb-1">AI IMPROVED</div>
                <p className="text-xs text-foreground">{descDiff.improved}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-status-confirmed text-white transition-colors"
                  onClick={() => {
                    update('description', descDiff.improved);
                    setDescDiff(null);
                  }}
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setDescDiff(null)}
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ) : (
            <textarea
              className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
            />
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <button
              onClick={generateTags}
              disabled={!!aiLoading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium transition-colors bg-primary/10 text-primary"
            >
              {aiLoading === 'tags' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI Tags
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.category_tags || []).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
              >
                {tag}
                <button onClick={() => update('category_tags', form.category_tags.filter((t) => t !== tag))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            className="w-full text-xs px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Add tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                update('category_tags', [...(form.category_tags || []), tagInput.trim()]);
                setTagInput('');
              }
            }}
          />
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground block">Contact</label>
          <input
            className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Phone"
            value={form.phone || ''}
            onChange={(e) => update('phone', e.target.value)}
          />
          <input
            className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Website"
            value={form.website || ''}
            onChange={(e) => update('website', e.target.value)}
          />
          <input
            className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Instagram handle"
            value={form.instagram_handle || ''}
            onChange={(e) => update('instagram_handle', e.target.value)}
          />
        </div>

        {/* Rating display */}
        {listing.avg_rating && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-foreground">{listing.avg_rating}</span>
            <span className="text-xs text-muted-foreground">({listing.review_count} reviews)</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────

function CommandPalette({
  onClose,
  onApplyFilter,
}: {
  onClose: () => void;
  onApplyFilter: (filter: Record<string, string>) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ explanation: string; filter: Record<string, string> } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function runQuery() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command_query', query }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Show all restaurants in Caracas without descriptions',
    'Find hotels in Margarita with rating above 4',
    'List experiences missing tags',
    'Show archived listings in Los Roques',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Command className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex-1 text-sm outline-none placeholder:text-muted-foreground text-foreground bg-transparent"
            placeholder="Type a natural language query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runQuery();
              if (e.key === 'Escape') onClose();
            }}
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result && !query && (
          <div className="p-3 space-y-1">
            <p className="text-2xs text-muted-foreground px-2 mb-2 font-medium uppercase tracking-wide">Suggestions</p>
            {suggestions.map((s) => (
              <button
                key={s}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg text-left transition-colors"
                onClick={() => setQuery(s)}
              >
                <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}

        {result && (
          <div className="p-4 space-y-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-foreground font-medium">{result.explanation}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Filters: {JSON.stringify(result.filter)}
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors"
                onClick={() => {
                  onApplyFilter(result.filter as Record<string, string>);
                  onClose();
                }}
              >
                Apply Filter
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setResult(null)}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bulk Preview Modal ───────────────────────────────────────────────────────

function BulkPreviewModal({
  preview,
  onApply,
  onClose,
}: {
  preview: BulkPreview;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Preview bulk changes">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Preview Changes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{preview.changes.length} listings will be updated</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Close preview">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {preview.changes.map(({ id, name, before, after }) => (
            <div key={id} className="px-5 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{name}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-status-cancelled line-through">
                    {before.type !== after.type ? before.type : before.status !== after.status ? before.status : before.region}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-status-confirmed font-medium">
                    {after.type !== before.type ? after.type : after.status !== before.status ? after.status : after.region}
                  </span>
                </div>
              </div>
              <Check className="w-4 h-4 text-status-confirmed" />
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
          >
            Apply All ({preview.changes.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Bulk Progress ─────────────────────────────────────────────────────────

function AIBulkProgress({
  results,
  total,
  action,
  onApply,
  onClose,
}: {
  results: Array<{ id: string; name: string; description?: string; tags?: string[] }>;
  total: number;
  action: string;
  onApply: () => void;
  onClose: () => void;
}) {
  const done = results.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">AI Processing…</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Reviewed {done} of {total} listings</p>
        </div>
        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{pct}% complete</p>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border mt-2">
          {results.map(({ id, name, description, tags }) => (
            <div key={id} className="px-5 py-3">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              {description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
              {tags && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tags.slice(0, 5).map((t) => (
                    <span key={t} className="text-2xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {done === total && (
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:bg-muted">
              Discard
            </button>
            <button
              onClick={onApply}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-status-confirmed text-white"
            >
              Apply All
            </button>
          </div>
        )}
        {done < total && (
          <div className="px-5 py-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">AI is reviewing listings…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Outreach Modal ───────────────────────────────────────────────────────────

interface OutreachMessages {
  whatsapp_message: string | null;
  instagram_dm: string | null;
  email_subject: string;
  email_body: string;
}

function OutreachModal({
  listing,
  onClose,
  onSent,
}: {
  listing: Listing;
  onClose: () => void;
  onSent: () => void;
}) {
  const [tab, setTab] = useState<'whatsapp' | 'instagram' | 'email'>('whatsapp');
  const [messages, setMessages] = useState<OutreachMessages | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    generateMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateMessages = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/outreach/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: listing.id, channels: ['whatsapp', 'instagram', 'email'] }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
        setEditedText(getTabText(data, tab));
      }
    } finally {
      setGenerating(false);
    }
  };

  const getTabText = (msgs: OutreachMessages | null, t: string): string => {
    if (!msgs) return '';
    if (t === 'whatsapp') return msgs.whatsapp_message ?? '';
    if (t === 'instagram') return msgs.instagram_dm ?? '';
    return `${msgs.email_subject}\n\n${msgs.email_body}`;
  };

  const handleTabChange = (t: 'whatsapp' | 'instagram' | 'email') => {
    setTab(t);
    setEditMode(false);
    setEditedText(getTabText(messages, t));
  };

  const handleSend = async () => {
    const messageText = editMode ? editedText : getTabText(messages, tab);
    setSending(true);
    try {
      await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: listing.id,
          business_name: listing.name,
          business_type: listing.type,
          business_region: listing.region,
          channel: tab,
          message_text: messageText,
        }),
      });
      await fetch('/api/admin/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listing.id, platform_status: 'outreach_sent' }),
      });
      setSent(tab);
      onSent();
    } finally {
      setSending(false);
    }
  };

  const tabConfig = {
    whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" />, activeCls: 'border-b-[#25D366] text-[#25D366]', msgCls: 'bg-green-50 border border-green-200' },
    instagram: { label: 'Instagram DM', icon: <AtSign className="w-3.5 h-3.5" />, activeCls: 'border-b-[#E1306C] text-[#E1306C]', msgCls: 'bg-pink-50 border border-pink-200' },
    email: { label: 'Email', icon: <Mail className="w-3.5 h-3.5" />, activeCls: 'border-b-primary text-primary', msgCls: 'bg-primary/5 border border-primary/20' },
  };

  const currentText = editMode ? editedText : getTabText(messages, tab);
  const tc = tabConfig[tab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-background rounded-2xl shadow-2xl w-[820px] max-h-[90vh] flex overflow-hidden">
        {/* Left panel: Business info */}
        <div className="w-[280px] flex-shrink-0 border-r border-border p-5 overflow-y-auto bg-muted/30">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Negocio</p>
          {listing.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.cover_image_url}
              alt={listing.name}
              className="w-full h-32 object-cover rounded-xl mb-3"
            />
          )}
          <h3 className="font-bold text-foreground capitalize text-sm">{listing.name}</h3>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{listing.type} · {listing.region}</p>

          {listing.avg_rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-foreground">{listing.avg_rating}</span>
              <span className="text-xs text-muted-foreground">({listing.review_count} reseñas)</span>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {listing.phone && (
              <div className="flex items-center gap-2 text-xs text-foreground">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>{listing.phone}</span>
              </div>
            )}
            {listing.website && (
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Send className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{listing.website}</span>
              </div>
            )}
            {listing.instagram_handle && (
              <div className="flex items-center gap-2 text-xs text-foreground">
                <AtSign className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span>@{listing.instagram_handle}</span>
              </div>
            )}
          </div>

          {listing.google_place_id && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(listing.name + ' ' + listing.city)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
            >
              Ver en Google Maps →
            </a>
          )}
        </div>

        {/* Right panel: Messages */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="font-bold text-foreground text-sm">Enviar Outreach ⚡</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Mensaje generado por IA · Personalizado</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded transition-colors" aria-label="Close outreach modal">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel tabs */}
          <div className="flex border-b border-border">
            {(['whatsapp', 'instagram', 'email'] as const).map((t) => {
              const c = tabConfig[t];
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    isActive ? c.activeCls : 'border-b-transparent text-muted-foreground'
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>

          {/* Message area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {generating ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Generando mensajes personalizados con IA...</p>
              </div>
            ) : messages ? (
              <div className="space-y-3">
                <div className={`rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${tc.msgCls}`}>
                  {editMode ? (
                    <>
                      <label htmlFor="outreach-edit" className="sr-only">Edit outreach message</label>
                      <textarea
                        id="outreach-edit"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={8}
                        className="w-full bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-primary rounded text-gray-800"
                      />
                    </>
                  ) : (
                    <p className="text-gray-800">{currentText}</p>
                  )}
                </div>
                {sent === tab && (
                  <div className="flex items-center gap-2 text-green-600 text-xs">
                    <Check className="w-3.5 h-3.5" />
                    Enviado y registrado en el CRM
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Error al generar mensajes</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <button
              onClick={generateMessages}
              disabled={generating || sending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Regenerate AI messages"
            >
              <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} /> Regenerar
            </button>
            <button
              onClick={() => { setEditMode(!editMode); if (!editMode) setEditedText(getTabText(messages, tab)); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-background transition-colors"
            >
              <Edit2 className="w-3 h-3" /> {editMode ? 'Cancelar edición' : 'Editar'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSend}
              disabled={sending || !messages || !!sent}
              className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                sent === tab ? 'bg-status-confirmed' : 'bg-primary'
              }`}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : sent === tab ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {sent === tab ? 'Enviado' : `Enviar por ${tc.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full py-24 text-gray-400">Loading…</div>}>
      <AdminListingsInner />
    </Suspense>
  );
}

function AdminListingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOffset, setApiOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [region, setRegion] = useState(searchParams.get('region') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [platformStatus, setPlatformStatus] = useState(searchParams.get('platformStatus') || 'all');
  const [missingData, setMissingData] = useState(searchParams.get('missingData') || '');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [aiPopoverRow, setAiPopoverRow] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkPreview | null>(null);
  const [aiProgress, setAiProgress] = useState<{
    results: Array<{ id: string; name: string; description?: string; tags?: string[] }>;
    total: number;
    action: string;
    ids: string[];
  } | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [outreachListing, setOutreachListing] = useState<Listing | null>(null);

  // Fetch listings with offset-based pagination
  const fetchListings = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/admin/listings?limit=50&offset=${offset}`);
      const data = await res.json();
      const page = data.listings || [];
      if (append) {
        setAllListings((prev) => [...prev, ...page]);
      } else {
        setAllListings(page);
      }
      setApiOffset(offset + page.length);
      setHasMore(page.length === 50);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    fetchListings(apiOffset, true);
  }, [fetchListings, apiOffset]);

  useEffect(() => { fetchListings(0); }, [fetchListings]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let list = allListings;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.region?.toLowerCase().includes(q) ||
          l.type?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
      );
    }
    if (category !== 'all') {
      list = list.filter((l) => l.derivedCategory === category || l.type === category);
    }
    if (region !== 'all') {
      list = list.filter((l) => l.region === region);
    }
    if (status !== 'all') {
      list = list.filter((l) => l.status === status);
    }
    if (platformStatus !== 'all') {
      list = list.filter((l) => (l.platform_status || 'scraped') === platformStatus);
    }
    if (missingData === 'description') {
      list = list.filter((l) => !l.description || l.description.length < 30);
    } else if (missingData === 'tags') {
      list = list.filter((l) => !l.category_tags || l.category_tags.length === 0);
    } else if (missingData === 'phone') {
      list = list.filter((l) => !l.phone);
    } else if (missingData === 'photo') {
      list = list.filter((l) => !l.cover_image_url);
    }

    list = [...list].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortCol] ?? '');
      const bVal = String((b as unknown as Record<string, unknown>)[sortCol] ?? '');
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [allListings, search, category, region, status, platformStatus, missingData, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const platformStats = useMemo(() => {
    const counts: Record<string, number> = { scraped: 0, outreach_sent: 0, interested: 0, onboarding: 0, verified: 0, founding_partner: 0 };
    for (const l of allListings) {
      const ps = l.platform_status || 'scraped';
      if (ps in counts) counts[ps]++;
    }
    return counts;
  }, [allListings]);

  function sort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronUp className="w-3 h-3 text-muted-foreground/40" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  }

  // Selection
  const allSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));
  function toggleAll() {
    if (allSelected) {
      setSelectedIds((s) => { const n = new Set(s); paginated.forEach((l) => n.delete(l.id)); return n; });
    } else {
      setSelectedIds((s) => { const n = new Set(s); paginated.forEach((l) => n.add(l.id)); return n; });
    }
  }
  function toggleOne(id: string) {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Row-level AI action
  async function handleRowAI(listing: Listing, action: string) {
    setToast({ msg: 'Running AI…', type: 'info' });
    try {
      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, listing, id: listing.id, save: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setAllListings((prev) => prev.map((l) => {
          if (l.id !== listing.id) return l;
          if (action === 'generate_description' || action === 'improve_description') return { ...l, description: data.description || data.improved };
          if (action === 'generate_tags') return { ...l, category_tags: data.tags };
          if (action === 'auto_categorize') return { ...l, type: data.type };
          if (action === 'improve_name') return { ...l, name: data.improved };
          return l;
        }));
        setToast({ msg: `✓ AI applied: ${action.replace(/_/g, ' ')}`, type: 'success' });
      }
    } catch {
      setToast({ msg: 'AI action failed', type: 'error' });
    }
  }

  // Bulk ops
  async function executeBulk(preview?: boolean) {
    if (!bulkAction || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    if (bulkAction.startsWith('set_platform_')) {
      const ps = bulkAction.replace('set_platform_', '');
      const res = await fetch('/api/admin/listings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'set_field', field: 'platform_status', value: ps }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ msg: `Updated platform status for ${data.count} listings`, type: 'success' });
        setSelectedIds(new Set());
        setBulkAction('');
        await fetchListings(0);
      }
      return;
    }

    if (bulkAction.startsWith('ai_')) {
      // AI bulk
      const aiAction = bulkAction === 'ai_describe' ? 'bulk_generate_descriptions' : 'bulk_auto_tag';
      setAiProgress({ results: [], total: ids.length, action: aiAction, ids });

      const res = await fetch('/api/admin/listings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: aiAction, ids }),
      });
      const data = await res.json();
      setAiProgress((p) => p ? { ...p, results: data.results || [] } : null);
      return;
    }

    if (preview) {
      const res = await fetch('/api/admin/listings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: bulkAction, value: bulkValue, preview: true }),
      });
      const data = await res.json();
      setBulkPreview({ changes: data.changes, action: bulkAction, value: bulkValue });
      return;
    }

    const res = await fetch('/api/admin/listings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action: bulkAction, value: bulkValue }),
    });
    const data = await res.json();
    if (res.ok) {
      setToast({ msg: `Updated ${data.count} listings`, type: 'success' });
      setSelectedIds(new Set());
      setBulkAction('');
      setBulkPreview(null);
      await fetchListings(0);
    }
  }

  async function applyAIResults() {
    if (!aiProgress) return;
    const { ids, action } = aiProgress;
    await fetch('/api/admin/listings/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ids, save: true }),
    });
    setToast({ msg: `Applied AI changes to ${ids.length} listings`, type: 'success' });
    setAiProgress(null);
    await fetchListings(0);
  }

  // Save from edit panel
  async function handleSave(updated: Listing) {
    setAllListings((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setEditingListing(null);
    setToast({ msg: `Saved "${updated.name}"`, type: 'success' });
  }

  // Apply command palette filter
  function applyCommandFilter(filter: Record<string, string>) {
    if (filter.search) setSearch(filter.search);
    if (filter.category) setCategory(filter.category);
    if (filter.region) setRegion(filter.region);
    if (filter.status) setStatus(filter.status);
    if (filter.missingData) setMissingData(filter.missingData);
    setPage(1);
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="flex flex-col h-full min-h-screen bg-muted/30">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-status-confirmed/10 text-status-confirmed'
              : toast.type === 'error'
              ? 'bg-status-cancelled/10 text-status-cancelled'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {toast.type === 'success' && <Check className="w-4 h-4" />}
          {toast.type === 'error' && <X className="w-4 h-4" />}
          {toast.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} onApplyFilter={applyCommandFilter} />
      )}
      {bulkPreview && (
        <BulkPreviewModal
          preview={bulkPreview}
          onClose={() => setBulkPreview(null)}
          onApply={() => { setBulkPreview(null); executeBulk(false); }}
        />
      )}
      {aiProgress && (
        <AIBulkProgress
          results={aiProgress.results}
          total={aiProgress.total}
          action={aiProgress.action}
          onApply={applyAIResults}
          onClose={() => setAiProgress(null)}
        />
      )}

      {/* Page Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Listings Manager</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Loading…' : `${filtered.length.toLocaleString()} of ${allListings.length.toLocaleString()} listings`}
            </p>
            {!loading && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-2xs text-muted-foreground">{platformStats.scraped.toLocaleString()} scraped</span>
                {platformStats.outreach_sent > 0 && <span className="text-2xs text-status-pending">{platformStats.outreach_sent} outreach sent</span>}
                {platformStats.interested > 0 && <span className="text-2xs text-primary">{platformStats.interested} interested</span>}
                {platformStats.onboarding > 0 && <span className="text-2xs text-status-payment-submitted">{platformStats.onboarding} onboarding</span>}
                <span className="text-2xs text-status-confirmed font-medium">{(platformStats.verified + platformStats.founding_partner).toLocaleString()} onboarded ({platformStats.verified}V + {platformStats.founding_partner}FP)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              title="Cmd+K"
              aria-label="Open command palette (Cmd+K)"
            >
              <Command className="w-3.5 h-3.5" />
              <span>Cmd+K</span>
            </button>
            <a
              href="/api/admin/listings/export"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              onClick={() => router.push('/admin/listings/new')}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Listing
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="listings-search" className="sr-only">Search listings</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="listings-search"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              placeholder="Search listings…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div>
            <label htmlFor="filter-category" className="sr-only">Filter by category</label>
            <select
              id="filter-category"
              className="text-sm px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="filter-region" className="sr-only">Filter by region</label>
            <select
              id="filter-region"
              className="text-sm px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background capitalize"
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
            >
              <option value="all">All Regions</option>
              {REGIONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="sr-only">Filter by status</label>
            <select
              id="filter-status"
              className="text-sm px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background capitalize"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s === 'all' ? 'All Statuses' : s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="filter-platform" className="sr-only">Filter by platform status</label>
            <select
              id="filter-platform"
              className="text-sm px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              value={platformStatus}
              onChange={(e) => { setPlatformStatus(e.target.value); setPage(1); }}
            >
              {PLATFORM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {missingData && (
            <button
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium bg-status-pending/10 text-status-pending"
              onClick={() => setMissingData('')}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Missing: {missingData}
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {(search || category !== 'all' || region !== 'all' || status !== 'all' || platformStatus !== 'all' || missingData) && (
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-2"
              onClick={() => { setSearch(''); setCategory('all'); setRegion('all'); setStatus('all'); setPlatformStatus('all'); setMissingData(''); setPage(1); }}
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Bulk actions bar */}
        {selectedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
            <div className="flex-1" />
            <select
              className="text-sm px-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Choose action…</option>
              <optgroup label="Platform">
                <option value="set_platform_verified">Set as Verified ✅</option>
                <option value="set_platform_founding_partner">Set as Founding Partner 🏆</option>
                <option value="set_platform_outreach_sent">Mark Outreach Sent</option>
                <option value="set_platform_scraped">Reset to Scraped</option>
              </optgroup>
              <optgroup label="Status">
                <option value="publish">Publish</option>
                <option value="feature">Feature</option>
                <option value="unfeature">Unfeature</option>
                <option value="archive">Archive</option>
              </optgroup>
              <optgroup label="Category">
                <option value="set_category">Set Category…</option>
              </optgroup>
              <optgroup label="Region">
                <option value="set_region">Set Region…</option>
              </optgroup>
              <optgroup label="✨ AI">
                <option value="ai_describe">AI: Generate Descriptions</option>
                <option value="ai_tag">AI: Auto-Tag</option>
              </optgroup>
            </select>

            {bulkAction === 'set_category' && (
              <select
                className="text-sm px-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <option value="">Pick category…</option>
                <option value="hotel">hotel</option>
                <option value="posada">posada</option>
                <option value="restaurante">restaurante</option>
                <option value="cafe">cafe</option>
                <option value="tours">tours</option>
                <option value="experience">experience</option>
              </select>
            )}
            {bulkAction === 'set_region' && (
              <select
                className="text-sm px-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
              >
                <option value="">Pick region…</option>
                {REGIONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            )}

            {bulkAction && !bulkAction.startsWith('ai_') && (
              <button
                onClick={() => executeBulk(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            )}
            {bulkAction?.startsWith('ai_') && (
              <button
                onClick={() => executeBulk(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-status-payment-submitted text-white transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Run AI
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-primary hover:text-primary/80 px-2"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background border-b border-border">
            <tr>
              <th className="w-10 px-3 py-3">
                <button
                  onClick={toggleAll}
                  className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={allSelected ? 'Deselect all listings' : 'Select all listings'}
                >
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="w-12 px-2 py-3" />
              {[
                { col: 'name', label: 'Name' },
                { col: 'type', label: 'Type' },
                { col: 'region', label: 'Region' },
                { col: 'avg_rating', label: 'Rating' },
                { col: 'review_count', label: 'Reviews' },
                { col: 'platform_status', label: 'Platform' },
                { col: 'status', label: 'Status' },
              ].map(({ col, label }) => (
                <th
                  key={col}
                  className="px-3 py-3 text-left text-muted-foreground cursor-pointer select-none"
                  onClick={() => sort(col)}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                    <SortIcon col={col} />
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="py-24 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading 1,170+ listings…</p>
                </td>
              </tr>
            )}
            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={9} className="py-24 text-center text-gray-400">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No listings match your filters</p>
                </td>
              </tr>
            )}
            {!loading && paginated.map((l, idx) => {
              const warnings = missingDataWarnings(l);
              const isSelected = selectedIds.has(l.id);
              const isAiOpen = aiPopoverRow === l.id;

              return (
                <tr
                  key={l.id}
                  className={`group border-b border-border hover:bg-primary/5 transition-colors ${
                    isSelected ? 'bg-primary/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleOne(l.id)}
                      className="text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label={isSelected ? `Deselect ${l.name}` : `Select ${l.name}`}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-2 py-2.5">
                    {l.cover_image_url ? (
                      <img src={l.cover_image_url} alt={l.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-muted" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[260px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{l.name}</span>
                      {warnings.length > 0 && (
                        <span title={`Missing: ${warnings.join(', ')}`}>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    {warnings.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {warnings.map((w) => (
                          <button
                            key={w}
                            className="text-2xs px-1.5 py-0.5 rounded-full font-medium bg-status-pending/10 text-status-pending"
                            onClick={() => handleRowAI(l, w === 'description' ? 'generate_description' : w === 'tags' ? 'generate_tags' : 'generate_description')}
                          >
                            Fix {w} ✨
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground capitalize">{l.type}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground capitalize">{l.region}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {l.avg_rating ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {l.avg_rating}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{l.review_count?.toLocaleString() || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {platformStatusBadge(l.platform_status)}
                  </td>
                  <td className="px-3 py-2.5">
                    {statusBadge(l.status)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* AI sparkle */}
                      <div className="relative">
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors"
                          title="AI Actions"
                          aria-label={`AI actions for ${l.name}`}
                          onClick={(e) => { e.stopPropagation(); setAiPopoverRow(isAiOpen ? null : l.id); }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        </button>
                        {isAiOpen && (
                          <AIRowPopover
                            listing={l}
                            onAction={(action) => handleRowAI(l, action)}
                            onClose={() => setAiPopoverRow(null)}
                          />
                        )}
                      </div>
                      {(!l.platform_status || l.platform_status === 'scraped') && (
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
                          title="Send Outreach"
                          aria-label={`Send outreach to ${l.name}`}
                          onClick={() => setOutreachListing(l)}
                        >
                          <Zap className="w-3.5 h-3.5 text-green-500" />
                        </button>
                      )}
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
                        title="Copy Invite Link"
                        aria-label={`Copy invite link for ${l.name}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/join/${l.slug}`;
                          await navigator.clipboard.writeText(url);
                          setToast({ msg: `Invite link copied for "${l.name}"`, type: 'success' });
                        }}
                      >
                        <Link2 className="w-3.5 h-3.5 text-cyan-600" />
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                        title="Edit"
                        aria-label={`Edit ${l.name}`}
                        onClick={() => setEditingListing(l)}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors"
                        title={l.status === 'featured' ? 'Unfeature' : 'Feature'}
                        aria-label={l.status === 'featured' ? `Unfeature ${l.name}` : `Feature ${l.name}`}
                        onClick={async () => {
                          await fetch('/api/admin/listings', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: l.id, status: l.status === 'featured' ? 'published' : 'featured' }),
                          });
                          setAllListings((prev) => prev.map((x) => x.id === l.id ? { ...x, status: x.status === 'featured' ? 'published' : 'featured' } : x));
                        }}
                      >
                        <Star className={`w-3.5 h-3.5 ${l.status === 'featured' ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} />
                      </button>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
                        title="Archive"
                        aria-label={`Archive ${l.name}`}
                        onClick={async () => {
                          if (!confirm(`Archive "${l.name}"? This will remove it from public listings.`)) return;
                          await fetch(`/api/admin/listings?id=${l.id}`, { method: 'DELETE' });
                          setAllListings((prev) => prev.map((x) => x.id === l.id ? { ...x, status: 'archived' } : x));
                          setToast({ msg: `Archived "${l.name}"`, type: 'success' });
                        }}
                      >
                        <Archive className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {!loading && hasMore && (
        <div className="bg-background border-t border-border px-6 py-3 flex items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{allListings.length.toLocaleString()} loaded</p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="bg-background border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground border border-border hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Panel */}
      {editingListing && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            onClick={() => setEditingListing(null)}
          />
          <EditPanel
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSave={handleSave}
          />
        </>
      )}

      {/* Outreach Modal */}
      {outreachListing && (
        <OutreachModal
          listing={outreachListing}
          onClose={() => setOutreachListing(null)}
          onSent={() => {
            setAllListings((prev) =>
              prev.map((x) => x.id === outreachListing.id ? { ...x, platform_status: 'outreach_sent' } : x)
            );
            setToast({ msg: `Outreach enviado para "${outreachListing.name}"`, type: 'success' });
          }}
        />
      )}
    </div>
  );
}
