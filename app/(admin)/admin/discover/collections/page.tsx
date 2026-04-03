'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Layers, Wand2, Loader2, X, Eye, EyeOff, Trash2,
  Edit3, Check, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Collection {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string;
  content_ids: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AI Build Collection Dialog
// ────────────────────────────────────────────────────────────────────────────

function AIBuildDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Collection) => void;
}) {
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; description: string; ids: string[] } | null>(null);

  async function handleBuild() {
    if (!theme.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discover/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'build_collection', theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!preview) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discover/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preview.name,
          description: preview.description,
          content_ids: preview.ids,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Collection "${preview.name}" created!`);
      onCreated(data.collection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI: Build Collection</h2>
            <p className="text-sm text-muted-foreground">Describe a theme and AI curates the content</p>
          </div>
          <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Collection theme</label>
            <input
              className="w-full px-3 py-2.5 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder='e.g. "Best Beaches", "Mountain Adventures", "Hidden Gems"'
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuild()}
              autoFocus
            />
          </div>

          {!preview && (
            <button
              onClick={handleBuild}
              disabled={loading || !theme.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate Collection
            </button>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                <p className="font-semibold">{preview.name}</p>
                <p className="text-sm text-muted-foreground">{preview.description}</p>
                <p className="text-xs text-muted-foreground">{preview.ids.length} items curated by AI</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create Collection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Create/Edit Collection Dialog
// ────────────────────────────────────────────────────────────────────────────

function CollectionModal({
  collection,
  onClose,
  onSaved,
  onDeleted,
}: {
  collection: Collection | null;
  onClose: () => void;
  onSaved: (c: Collection) => void;
  onDeleted?: (id: string) => void;
}) {
  const isNew = !collection;
  const [form, setForm] = useState({
    name: collection?.name ?? '',
    description: collection?.description ?? '',
    cover_image_url: collection?.cover_image_url ?? '',
    is_published: collection?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const url = '/api/admin/discover/collections';
      const method = isNew ? 'POST' : 'PATCH';
      const body = isNew ? form : { id: collection!.id, ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isNew ? 'Collection created!' : 'Saved!');
      onSaved(data.collection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!collection || !confirm('Delete this collection?')) return;
    try {
      const res = await fetch(`/api/admin/discover/collections?id=${collection.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted');
      onDeleted?.(collection.id);
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-bold text-lg flex-1">{isNew ? 'New Collection' : 'Edit Collection'}</h2>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Best Beaches of Venezuela"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              rows={2}
              placeholder="Curated collection of…"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cover image URL (optional)</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="https://…"
                value={form.cover_image_url}
                onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={form.is_published}
              onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
            />
            <span className="text-sm">Published (visible on discover page)</span>
          </label>

          <div className="flex gap-2 pt-2">
            {!isNew && (
              <button onClick={handleDelete} className="p-2.5 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Collections Page
// ────────────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    fetch('/api/admin/discover/collections')
      .then((r) => r.json())
      .then((d) => setCollections(d.collections ?? []))
      .catch(() => toast.error('Failed to load collections'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (c: Collection) => {
    setCollections((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx === -1) return [c, ...prev];
      const next = [...prev];
      next[idx] = c;
      return next;
    });
    setShowNew(false);
    setEditCollection(null);
  };

  const handleDeleted = (id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setEditCollection(null);
  };

  async function togglePublish(c: Collection) {
    const updated = { ...c, is_published: !c.is_published };
    setCollections((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    try {
      await fetch('/api/admin/discover/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, is_published: !c.is_published }),
      });
      toast.success(!c.is_published ? 'Published' : 'Unpublished');
    } catch {
      toast.error('Update failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <a href="/admin/discover" className="hover:text-foreground">Discover Feed</a>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Collections</span>
          </div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-muted-foreground text-sm">{collections.length} curated collections</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            AI: Build Collection
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed rounded-2xl">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-4">Create curated collections like "Best Beaches" or use AI to build one automatically.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              AI: Build Collection
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <div key={c.id} className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow group">
              {/* Cover */}
              <div className="h-36 bg-muted relative overflow-hidden">
                {c.cover_image_url ? (
                  <img src={c.cover_image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Layers className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditCollection(c)}
                    className="p-1.5 bg-white/90 rounded-lg shadow text-sm hover:bg-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePublish(c)}
                    className="p-1.5 bg-white/90 rounded-lg shadow text-sm hover:bg-white transition-colors"
                  >
                    {c.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {c.is_published && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Published</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">{c.content_ids.length} items</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <CollectionModal
          collection={null}
          onClose={() => setShowNew(false)}
          onSaved={handleSaved}
        />
      )}
      {editCollection && (
        <CollectionModal
          collection={editCollection}
          onClose={() => setEditCollection(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
      {showAI && (
        <AIBuildDialog
          onClose={() => setShowAI(false)}
          onCreated={(c) => {
            handleSaved(c);
            setShowAI(false);
          }}
        />
      )}
    </div>
  );
}
