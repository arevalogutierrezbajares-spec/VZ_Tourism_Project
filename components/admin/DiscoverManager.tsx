'use client';

import { useState, useCallback, useTransition } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  Plus, Grid3X3, List, Search, Filter, Wand2, Tag,
  MapPin, Star, Archive, Eye, EyeOff, Trash2, Edit3, X, Check,
  ChevronDown, Loader2, AlertCircle, Sparkles, Link2,
  Image as ImageIcon, Layers
} from 'lucide-react';

const Instagram = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
);
import toast from 'react-hot-toast';
import type { DiscoverContent } from '@/lib/discover-store';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'beach', label: 'Beaches', emoji: '🏖️' },
  { id: 'mountain', label: 'Mountains', emoji: '⛰️' },
  { id: 'city', label: 'Cities', emoji: '🏙️' },
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'activity', label: 'Adventures', emoji: '🎒' },
  { id: 'nature', label: 'Wildlife', emoji: '🌿' },
];

const REGIONS = [
  { id: 'all', label: 'All Regions' },
  { id: 'losroques', label: 'Los Roques' },
  { id: 'merida', label: 'Mérida' },
  { id: 'canaima', label: 'Canaima' },
  { id: 'margarita', label: 'Margarita Island' },
  { id: 'morrocoy', label: 'Morrocoy' },
  { id: 'caracas', label: 'Caracas' },
  { id: 'choroni', label: 'Choroní' },
  { id: 'falcon', label: 'Falcón' },
  { id: 'amazon', label: 'Amazonas' },
  { id: 'gransabana', label: 'Gran Sabana' },
];

const STATUSES = [
  { id: 'all', label: 'All Status' },
  { id: 'published', label: 'Published', color: 'bg-secondary/10 text-secondary' },
  { id: 'featured', label: 'Featured', color: 'bg-accent/10 text-accent' },
  { id: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { id: 'archived', label: 'Archived', color: 'bg-destructive/10 text-destructive' },
];

const LOCATION_TYPES = [
  'viewpoint', 'beach_access', 'trailhead', 'waterfall',
  'market', 'restaurant', 'hotel', 'wildlife_spot', 'cultural_site', 'activity_spot',
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const s = STATUSES.find((x) => x.id === status);
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s?.color ?? 'bg-gray-100 text-gray-600'}`}>
      {s?.label ?? status}
    </span>
  );
}

function qualityScore(item: DiscoverContent): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (!item.description) issues.push('Missing description');
  if (!item.tags || item.tags.length === 0) issues.push('No tags');
  if (!item.lat || !item.lng) issues.push('No geo-tag');
  if (!item.region) issues.push('No region');
  if (!item.caption) issues.push('No caption');
  return { score: Math.max(0, 5 - issues.length), issues };
}

// ────────────────────────────────────────────────────────────────────────────
// Instagram Import Dialog
// ────────────────────────────────────────────────────────────────────────────

function InstagramImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (item: DiscoverContent) => void;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleImport() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/discover/import-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      toast.success('Instagram post imported!');
      onImported(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Import from Instagram</h2>
            <p className="text-sm text-muted-foreground">Paste a public Instagram post URL</p>
          </div>
          <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Instagram Post URL</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="https://www.instagram.com/p/ABC123/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
            <p>✓ Works with public Instagram posts</p>
            <p>✓ Embeds the full post with likes &amp; comments</p>
            <p>✓ AI auto-fills caption, region, category, and tags</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing…
                </span>
              ) : (
                'Import Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Content Edit Modal
// ────────────────────────────────────────────────────────────────────────────

function ContentEditModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: DiscoverContent | null;
  onClose: () => void;
  onSave: (updated: DiscoverContent) => void;
  onDelete?: (id: string) => void;
}) {
  const isNew = !item?.id || item.id === '__new__';
  const [form, setForm] = useState<Partial<DiscoverContent>>(
    item ?? {
      type: 'photo',
      status: 'draft',
      category: 'nature',
      tags: [],
      featured: false,
      aspect: 1.0,
    }
  );
  const [tagInput, setTagInput] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<DiscoverContent>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  async function callAI(action: string) {
    setAiLoading(action);
    try {
      const res = await fetch('/api/admin/discover/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          caption: form.caption,
          description: form.description,
          region: form.region_name,
          category: form.category,
          location: form.geo_label || form.location_name,
          tags: form.tags,
          instagram_caption: form.caption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === 'generate_caption') update({ caption: data.result });
      else if (action === 'write_description') update({ description: data.result });
      else if (action === 'suggest_tags') update({ tags: data.result });
      toast.success('AI suggestion applied');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI failed');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleSave(newStatus?: string) {
    setSaving(true);
    const payload = newStatus ? { ...form, status: newStatus } : form;
    try {
      const url = isNew ? '/api/admin/discover' : '/api/admin/discover';
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? payload : { id: item!.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isNew ? 'Content created!' : 'Saved!');
      onSave(data.item);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item?.id) return;
    const caption = item.caption || 'this content';
    if (!confirm(`Delete "${caption}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/discover?id=${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted');
      onDelete?.(item.id);
    } catch {
      toast.error('Delete failed');
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) {
      update({ tags: [...(form.tags ?? []), t] });
    }
    setTagInput('');
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="w-full max-w-xl bg-card border-l shadow-2xl overflow-y-auto flex flex-col"
        style={{ maxHeight: '100vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b sticky top-0 bg-card z-10">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold flex-1">{isNew ? 'New Content' : 'Edit Content'}</h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={handleDelete}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive transition-colors"
                aria-label="Delete this content"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Instagram embed preview */}
          {form.instagram_embed_html && (
            <div className="rounded-xl overflow-hidden border bg-muted/20">
              <div className="px-3 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground">
                <Instagram className="w-3.5 h-3.5" />
                Instagram embed preview
              </div>
              <div
                className="p-3 flex justify-center"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.instagram_embed_html) }}
              />
            </div>
          )}

          {/* Photo URL / thumbnail */}
          {form.type === 'photo' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Photo URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://images.unsplash.com/..."
                  value={form.url ?? ''}
                  onChange={(e) => update({ url: e.target.value })}
                />
              </div>
              {form.url && (
                <img src={form.url} alt={form.caption || 'Discover content preview'} className="mt-2 w-full h-32 object-cover rounded-lg" />
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Caption</label>
              <span className="text-xs text-muted-foreground">{(form.caption ?? '').length}/100</span>
            </div>
            <div className="relative">
              <input
                className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-24"
                placeholder="Compelling caption…"
                maxLength={100}
                value={form.caption ?? ''}
                onChange={(e) => update({ caption: e.target.value })}
              />
              <button
                onClick={() => callAI('generate_caption')}
                disabled={!!aiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
              >
                {aiLoading === 'generate_caption' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                AI
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Description</label>
              <button
                onClick={() => callAI('write_description')}
                disabled={!!aiLoading}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {aiLoading === 'write_description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI: Describe this place
              </button>
            </div>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              rows={3}
              placeholder="2–3 evocative sentences…"
              value={form.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          {/* Region + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Region</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.region ?? ''}
                onChange={(e) => {
                  const r = REGIONS.find((x) => x.id === e.target.value);
                  update({ region: e.target.value, region_name: r?.label ?? '' });
                }}
              >
                <option value="">Select region…</option>
                {REGIONS.filter((r) => r.id !== 'all').map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.category ?? 'nature'}
                onChange={(e) => update({ category: e.target.value })}
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Tags</label>
              <button
                onClick={() => callAI('suggest_tags')}
                disabled={!!aiLoading}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {aiLoading === 'suggest_tags' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                AI: Suggest Tags
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags ?? []).map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                  {tag}
                  <button onClick={() => update({ tags: form.tags?.filter((t) => t !== tag) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Add tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button
                onClick={addTag}
                className="px-3 py-2 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">Location</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Location name (e.g. Gran Roque, Los Roques)"
              value={form.geo_label ?? ''}
              onChange={(e) => update({ geo_label: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.lat ?? ''}
                  onChange={(e) => update({ lat: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.lng ?? ''}
                  onChange={(e) => update({ lng: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <select
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={form.location_type ?? ''}
              onChange={(e) => update({ location_type: e.target.value })}
            >
              <option value="">Location type (optional)</option>
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Status + Credit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.status ?? 'draft'}
                onChange={(e) => update({ status: e.target.value as DiscoverContent['status'] })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="featured">Featured ✦</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Aspect ratio</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.aspect ?? 1.0}
                onChange={(e) => update({ aspect: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
          </div>

          {/* Credit */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Credit (optional)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Photographer name"
              value={form.credit ?? ''}
              onChange={(e) => update({ credit: e.target.value })}
            />
          </div>

          {/* Publish shortcut */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 border-secondary text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Publish
            </button>
            <button
              onClick={() => handleSave('featured')}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 border-amber-500 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              <Star className="w-4 h-4" />
              Feature
            </button>
            <button
              onClick={() => handleSave('archived')}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border border-dashed text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Content Card (Grid View)
// ────────────────────────────────────────────────────────────────────────────

function ContentCard({
  item,
  onEdit,
  onStatusChange,
}: {
  item: DiscoverContent;
  onEdit: (item: DiscoverContent) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { issues } = qualityScore(item);

  return (
    <div
      className="relative rounded-xl overflow-hidden border bg-card group cursor-pointer hover:shadow-lg transition-all duration-200"
      style={{ breakInside: 'avoid', marginBottom: '12px' }}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ aspectRatio: `1 / ${item.aspect ?? 1}` }}>
        {item.type === 'instagram_embed' ? (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt={item.caption} className="w-full h-full object-cover" />
            ) : (
              <Instagram className="w-10 h-10 text-purple-400" />
            )}
            <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram className="w-3 h-3 text-white" />
            </div>
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.caption}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">{statusBadge(item.status)}</div>

        {/* Quality warning */}
        {issues.length > 0 && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"
            title={issues.join(', ')}>
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm font-medium shadow-lg"
            onClick={() => onEdit(item)}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* Card footer */}
      <div className="p-3">
        <p className="text-xs font-medium line-clamp-2 mb-1">{item.caption}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {item.region_name || '—'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, item.status === 'published' ? 'draft' : 'published'); }}
              className="text-muted-foreground hover:text-foreground p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              title={item.status === 'published' ? 'Unpublish' : 'Publish'}
              aria-label={item.status === 'published' ? `Unpublish ${item.caption || 'content'}` : `Publish ${item.caption || 'content'}`}
            >
              {item.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quality issues */}
        {issues.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-amber-600 mb-1">{issues[0]}</p>
            <button
              onClick={() => onEdit(item)}
              className="text-xs text-primary font-medium hover:underline"
            >
              Fix with AI →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// List Row
// ────────────────────────────────────────────────────────────────────────────

function ListRow({
  item,
  onEdit,
  onStatusChange,
}: {
  item: DiscoverContent;
  onEdit: (item: DiscoverContent) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { issues } = qualityScore(item);
  const catEmoji = CATEGORIES.find((c) => c.id === item.category)?.emoji ?? '📷';

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="py-2.5 px-3">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {item.type === 'instagram_embed' ? (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              {item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.caption || 'Discover content'} className="w-full h-full object-cover" />
              ) : (
                <Instagram className="w-5 h-5 text-purple-400" />
              )}
            </div>
          ) : (
            <img src={item.url} alt={item.caption || 'Discover content'} className="w-full h-full object-cover" />
          )}
        </div>
      </td>
      <td className="py-2.5 px-3 max-w-xs">
        <p className="text-sm font-medium truncate">{item.caption || '—'}</p>
        {issues.length > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3 h-3" />
            {issues.join(' · ')}
          </p>
        )}
      </td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground">{item.region_name || '—'}</td>
      <td className="py-2.5 px-3 text-sm">{catEmoji} {item.category}</td>
      <td className="py-2.5 px-3">{statusBadge(item.status)}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">{item.source_type}</td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            aria-label={`Edit ${item.caption || 'content'}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStatusChange(item.id, item.status === 'published' ? 'draft' : 'published')}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            aria-label={item.status === 'published' ? `Unpublish ${item.caption || 'content'}` : `Publish ${item.caption || 'content'}`}
          >
            {item.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main DiscoverManager
// ────────────────────────────────────────────────────────────────────────────

export function DiscoverManager({ initialItems }: { initialItems: DiscoverContent[] }) {
  const [items, setItems] = useState<DiscoverContent[]>(initialItems);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<DiscoverContent | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [, startTransition] = useTransition();

  // Filtered items (client-side)
  const filtered = items.filter((item) => {
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterRegion !== 'all' && item.region !== filterRegion) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.caption.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.region_name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const qualityIssues = items.filter((i) => qualityScore(i).issues.length > 0);

  // Optimistic status change
  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus as DiscoverContent['status'] } : i))
    );
    try {
      await fetch('/api/admin/discover', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      toast.success(`Marked as ${newStatus}`);
    } catch {
      toast.error('Update failed');
    }
  }, []);

  const handleSaved = useCallback((updated: DiscoverContent) => {
    startTransition(() => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === updated.id);
        if (idx === -1) return [updated, ...prev];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    });
    setEditItem(null);
    setShowNewForm(false);
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setEditItem(null);
  }, []);

  const handleImported = useCallback((item: DiscoverContent) => {
    setItems((prev) => [item, ...prev]);
    setShowImport(false);
    // Open edit modal immediately so user can fill in AI-suggested metadata
    setEditItem(item);
  }, []);

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Discover Feed</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} items · {items.filter((i) => i.status === 'published').length} published ·{' '}
            {items.filter((i) => i.status === 'featured').length} featured
            {qualityIssues.length > 0 && (
              <span className="text-amber-600 ml-2">
                · ⚠ {qualityIssues.length} need attention
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/admin/discover/collections"
            className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Collections
          </a>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          >
            <Instagram className="w-4 h-4" />
            Import from Instagram
          </button>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </button>
        </div>
      </div>

      {/* Quality banner */}
      {qualityIssues.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-amber-800 font-medium">
            {qualityIssues.length} content items are missing descriptions, tags, or geo-tags.
          </span>
          <button
            onClick={() => setFilterStatus('all')}
            className="ml-auto text-amber-700 font-semibold hover:underline"
          >
            Review all →
          </button>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Region filter */}
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {items.length} items
        </p>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div style={{ columns: '4 240px', columnGap: '12px' }}>
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onStatusChange={handleStatusChange}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-24">
              <p className="text-4xl mb-3">📷</p>
              <p className="text-muted-foreground">No content matches your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Photo</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Caption</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Region</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Category</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Status</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Source</th>
                <th className="py-2.5 px-3 text-left font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <ListRow
                  key={item.id}
                  item={item}
                  onEdit={setEditItem}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    No content matches your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Instagram import dialog */}
      {showImport && (
        <InstagramImportDialog
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {/* New content modal */}
      {showNewForm && (
        <ContentEditModal
          item={null}
          onClose={() => setShowNewForm(false)}
          onSave={handleSaved}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <ContentEditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaved}
          onDelete={handleDeleted}
        />
      )}
    </div>
  );
}
