'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Phone, Mail, MessageSquare, Star, Plus, X, ChevronDown, Link2,
  Calendar, Clock, Building2, User, StickyNote, ArrowRight,
  CheckCircle2, Loader2, Filter,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderNote {
  id: string;
  text: string;
  created_at: string;
}

interface ContactHistoryEntry {
  type: 'email' | 'phone' | 'whatsapp';
  date: string;
  note: string;
}

interface PipelineProvider {
  id: string;
  business_id: string;
  business_name: string;
  type: string;
  region: string;
  stage: string;
  tier: 'A' | 'B' | 'C';
  entered_stage_at: string;
  phone?: string | null;
  cover_image_url?: string | null;
  avg_rating?: number | null;
  notes: ProviderNote[];
  contact_history: ContactHistoryEntry[];
  assigned_to: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: { id: string; label: string; color: string; activeBg: string; dropBorder: string }[] = [
  { id: 'lead',           label: 'Lead',           color: '#6B7280', activeBg: 'bg-muted',         dropBorder: 'border-muted-foreground' },
  { id: 'contacted',      label: 'Contacted',      color: '#2563EB', activeBg: 'bg-primary/10',    dropBorder: 'border-primary' },
  { id: 'interested',     label: 'Interested',     color: '#D97706', activeBg: 'bg-status-pending/10', dropBorder: 'border-status-pending' },
  { id: 'call_scheduled', label: 'Call Scheduled', color: '#7C3AED', activeBg: 'bg-primary/10',    dropBorder: 'border-primary/40' },
  { id: 'onboarding',     label: 'Onboarding',     color: '#0891B2', activeBg: 'bg-primary/5',     dropBorder: 'border-primary/30' },
  { id: 'live',           label: 'Live',           color: '#059669', activeBg: 'bg-status-confirmed/10', dropBorder: 'border-status-confirmed' },
];

const TIER_CLASSES: Record<string, string> = {
  A: 'bg-status-cancelled/10 text-status-cancelled',
  B: 'bg-status-pending/10 text-status-pending',
  C: 'bg-muted text-muted-foreground',
};

const REGIONS = ['caracas', 'merida', 'los-roques', 'gran-sabana', 'isla-margarita', 'llanos', 'maracaibo', 'delta'];

function daysInStage(enteredAt: string): number {
  return Math.floor((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24));
}

function stageIndex(stage: string): number {
  return STAGES.findIndex((s) => s.id === stage);
}

// ─── Provider Card ─────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  provider: PipelineProvider;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: (provider: PipelineProvider) => void;
}) {
  const tierCls = TIER_CLASSES[provider.tier] ?? TIER_CLASSES.C!;
  const days = daysInStage(provider.entered_stage_at);
  const stage = STAGES.find((s) => s.id === provider.stage);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(provider.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(provider)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(provider); } }}
      tabIndex={0}
      role="button"
      aria-label={`${provider.business_name} — ${provider.type}, ${provider.region.replace('-', ' ')}. Click to view details, drag to change stage.`}
      className="rounded-lg border border-border cursor-pointer select-none transition-all hover:shadow-md active:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary bg-background shadow-sm"
    >
      {/* Cover image */}
      {provider.cover_image_url && (
        <div className="rounded-t-lg overflow-hidden" style={{ height: 80 }}>
          <img
            src={provider.cover_image_url}
            alt={provider.business_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Name + type */}
        <div className="flex items-start justify-between gap-1">
          <span className="font-semibold text-sm text-foreground leading-tight">{provider.business_name}</span>
          <span className="flex-shrink-0 text-2xs font-medium px-1.5 py-0.5 rounded capitalize bg-primary/10 text-primary">
            {provider.type}
          </span>
        </div>

        {/* Region */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="capitalize">{provider.region.replace('-', ' ')}</span>
        </div>

        {/* Tier + days */}
        <div className="flex items-center justify-between">
          <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${tierCls}`}>
            Tier {provider.tier}
          </span>
          <span className="text-2xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {days}d in {stage?.label ?? provider.stage}
          </span>
        </div>

        {/* Contact icons + invite link + rating */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="flex items-center gap-2">
            {provider.phone && (
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {provider.phone && (
              <MessageSquare className="w-3.5 h-3.5 text-status-confirmed" />
            )}
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <button
              title="Copy Invite Link"
              aria-label={`Copy invite link for ${provider.business_name}`}
              onClick={(e) => {
                e.stopPropagation();
                const slug = provider.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const url = `${window.location.origin}/join/${slug}`;
                navigator.clipboard.writeText(url);
              }}
              className="hover:bg-primary/10 rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          {provider.avg_rating && (
            <span className="text-2xs text-muted-foreground flex items-center gap-0.5">
              <Star className="w-3 h-3 text-accent fill-accent" />
              {provider.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Provider Detail Modal ─────────────────────────────────────────────────────

function ProviderModal({
  provider,
  onClose,
  onStageChange,
  onNoteAdd,
}: {
  provider: PipelineProvider;
  onClose: () => void;
  onStageChange: (id: string, stage: string) => Promise<void>;
  onNoteAdd: (id: string, text: string) => Promise<void>;
}) {
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const currentIdx = stageIndex(provider.stage);
  const nextStage = STAGES[currentIdx + 1];

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await onNoteAdd(provider.id, noteText.trim());
    setNoteText('');
    setSavingNote(false);
  }

  async function handleMove(stageId: string) {
    setMovingTo(stageId);
    await onStageChange(provider.id, stageId);
    setMovingTo(null);
  }

  const contactIcon = { email: Mail, phone: Phone, whatsapp: MessageSquare };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl w-full overflow-hidden flex flex-col bg-background"
        style={{ maxWidth: 640, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground text-lg leading-tight">{provider.business_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs capitalize text-muted-foreground">{provider.type}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground capitalize">{provider.region.replace('-', ' ')}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${TIER_CLASSES[provider.tier] ?? TIER_CLASSES.C}`}>
                Tier {provider.tier}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary text-muted-foreground" aria-label="Close provider details">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Stage progress */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">PIPELINE STAGE</p>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGES.map((s, i) => {
                const isActive = s.id === provider.stage;
                const isPast = i < currentIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleMove(s.id)}
                    disabled={movingTo !== null}
                    className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                      isActive
                        ? 'text-white font-semibold'
                        : isPast
                        ? 'bg-muted text-muted-foreground border-border'
                        : 'bg-background text-foreground border-border'
                    }`}
                    style={isActive ? { background: s.color, borderColor: s.color } : undefined}
                  >
                    {movingTo === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">CONTACT</p>
            <div className="flex gap-2 flex-wrap">
              {provider.phone && (
                <a
                  href={`tel:${provider.phone}`}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {provider.phone}
                </a>
              )}
              {provider.phone && (
                <a
                  href={`https://wa.me/${provider.phone?.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-status-confirmed/30 text-status-confirmed hover:bg-status-confirmed/10"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => {
                  const slug = provider.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  navigator.clipboard.writeText(`${window.location.origin}/join/${slug}`);
                }}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
              >
                <Link2 className="w-3.5 h-3.5" />
                Copy Invite Link
              </button>
              {nextStage && (
                <button
                  onClick={() => handleMove(nextStage.id)}
                  disabled={movingTo !== null}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium text-white transition-all"
                  style={{ background: nextStage.color }}
                >
                  {movingTo === nextStage.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowRight className="w-3.5 h-3.5" />}
                  Move to {nextStage.label}
                </button>
              )}
              {provider.stage !== 'live' ? null : (
                <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-status-confirmed bg-status-confirmed/10 border border-status-confirmed/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live
                </span>
              )}
            </div>
          </div>

          {/* Contact history */}
          {provider.contact_history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">CONTACT HISTORY</p>
              <div className="space-y-2">
                {provider.contact_history.map((entry, i) => {
                  const Icon = contactIcon[entry.type];
                  return (
                    <div key={i} className="flex gap-2.5 text-sm">
                      <div className="mt-0.5 flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground">{entry.note}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">NOTES</p>
            {provider.notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {provider.notes.map((note) => (
                  <div key={note.id} className="rounded-lg p-3 text-sm bg-muted border border-border">
                    <p className="text-foreground">{note.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <label htmlFor="provider-note" className="sr-only">Add a note</label>
              <input
                id="provider-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                placeholder="Add a note..."
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || savingNote}
                className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-primary text-primary-foreground"
              >
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
            <div>
              <span className="font-medium text-foreground">Assigned to</span>
              <p>{provider.assigned_to || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Added</span>
              <p>{new Date(provider.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Days in stage</span>
              <p>{daysInStage(provider.entered_stage_at)} days</p>
            </div>
            {provider.avg_rating && (
              <div>
                <span className="font-medium text-foreground">Rating</span>
                <p className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-accent fill-accent" />
                  {provider.avg_rating.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<PipelineProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<PipelineProvider | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  async function fetchProviders() {
    const params = new URLSearchParams();
    if (filterRegion) params.set('region', filterRegion);
    if (filterTier) params.set('tier', filterTier);
    if (filterType) params.set('type', filterType);
    const res = await fetch(`/api/admin/providers?${params}`);
    const data = await res.json();
    setProviders(data.providers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProviders();
  }, [filterRegion, filterTier, filterType]);

  async function handleStageChange(id: string, stage: string) {
    await fetch('/api/admin/providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'move_stage', stage }),
    });
    await fetchProviders();
    // Update selected provider if open
    setSelectedProvider((prev) =>
      prev?.id === id ? { ...prev, stage, entered_stage_at: new Date().toISOString() } : prev
    );
  }

  async function handleNoteAdd(id: string, text: string) {
    const res = await fetch('/api/admin/providers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'add_note', text }),
    });
    const data = await res.json();
    await fetchProviders();
    if (data.provider) setSelectedProvider(data.provider);
  }

  // Drag-and-drop
  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDropTarget(stageId);
  }

  async function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    if (dragId) {
      const p = providers.find((x) => x.id === dragId);
      if (p && p.stage !== stageId) {
        await handleStageChange(dragId, stageId);
      }
    }
    setDragId(null);
    setDropTarget(null);
  }

  // Stats
  const stageCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = providers.filter((p) => p.stage === s.id).length;
    return acc;
  }, {});
  const total = providers.length;
  const liveCount = stageCounts['live'] ?? 0;
  const conversionRate = total > 0 ? ((liveCount / total) * 100).toFixed(0) : '0';

  const avgDaysToLive = (() => {
    const liveProviders = providers.filter((p) => p.stage === 'live');
    if (!liveProviders.length) return 0;
    const avg = liveProviders.reduce((s, p) => s + daysInStage(p.created_at), 0) / liveProviders.length;
    return Math.round(avg);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Provider Onboarding Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track providers from lead to live</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterRegion || filterTier || filterType) && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
              Add from Scraped
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="ml-2 font-bold text-foreground">{total}</span>
          </div>
          {STAGES.map((s) => (
            <div key={s.id} className="text-sm">
              <span style={{ color: s.color }} className="font-medium">{s.label}</span>
              <span className="ml-1.5 font-bold text-foreground">{stageCounts[s.id] ?? 0}</span>
            </div>
          ))}
          <div className="text-sm ml-auto">
            <span className="text-muted-foreground">Conversion</span>
            <span className="ml-2 font-bold text-status-confirmed">{conversionRate}%</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Avg days to live</span>
            <span className="ml-2 font-bold text-foreground">{avgDaysToLive}d</span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <div>
              <label htmlFor="filter-region" className="sr-only">Filter by region</label>
              <select
                id="filter-region"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r.replace('-', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-tier" className="sr-only">Filter by tier</label>
              <select
                id="filter-tier"
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All tiers</option>
                <option value="A">Tier A</option>
                <option value="B">Tier B</option>
                <option value="C">Tier C</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="sr-only">Filter by type</label>
              <select
                id="filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All types</option>
                <option value="hotel">Hotel</option>
                <option value="restaurant">Restaurant</option>
                <option value="tour">Tour</option>
                <option value="experience">Experience</option>
              </select>
            </div>
            {(filterRegion || filterTier || filterType) && (
              <button
                onClick={() => { setFilterRegion(''); setFilterTier(''); setFilterType(''); }}
                className="text-sm text-status-cancelled hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full" style={{ minWidth: STAGES.length * 240 }}>
          {STAGES.map((stage) => {
            const columnProviders = providers.filter((p) => p.stage === stage.id);
            const isDropTarget = dropTarget === stage.id;

            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-xl flex-shrink-0 transition-all border-2 ${
                  isDropTarget
                    ? `${stage.activeBg} ${stage.dropBorder}`
                    : 'bg-muted/50 border-transparent'
                }`}
                style={{ width: 240 }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div
                  className="px-3 py-2.5 rounded-t-xl flex items-center justify-between"
                  style={{ background: stage.color }}
                >
                  <span className="text-white font-semibold text-sm">{stage.label}</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                  >
                    {columnProviders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnProviders.length === 0 && (
                    <div
                      className="rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground py-6"
                    >
                      Drop here
                    </div>
                  )}
                  {columnProviders.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      onDragStart={setDragId}
                      onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                      onClick={setSelectedProvider}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider detail modal */}
      {selectedProvider && (
        <ProviderModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onStageChange={handleStageChange}
          onNoteAdd={handleNoteAdd}
        />
      )}

      {/* Add from scraped modal (placeholder) */}
      {showAddModal && (
        <AddFromScrapedModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (data) => {
            await fetch('/api/admin/providers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            await fetchProviders();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Add from Scraped Modal ────────────────────────────────────────────────────

function AddFromScrapedModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { business_id: string; business_name: string; type: string; region: string; tier: string; phone?: string }) => Promise<void>;
}) {
  const [listings, setListings] = useState<Array<{ id: string; name: string; type: string; region: string; phone: string | null }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/listings?limit=50')
      .then((r) => r.json())
      .then((d) => {
        setListings(d.listings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = listings.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl w-full overflow-hidden flex flex-col bg-background"
        style={{ maxWidth: 520, maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Add from Scraped Listings</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-3 border-b border-border">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No listings found</p>
          ) : (
            filtered.slice(0, 30).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{l.type} · {l.region}</p>
                </div>
                <button
                  disabled={adding === l.id}
                  onClick={async () => {
                    setAdding(l.id);
                    await onAdd({
                      business_id: l.id,
                      business_name: l.name,
                      type: l.type,
                      region: l.region,
                      tier: 'B',
                      phone: l.phone ?? undefined,
                    });
                    setAdding(null);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all bg-primary text-primary-foreground"
                >
                  {adding === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
