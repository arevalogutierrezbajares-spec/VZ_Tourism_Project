'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Phone, Mail, MessageSquare, Star, Plus, X, ChevronDown,
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

const STAGES: { id: string; label: string; color: string; bg: string; border: string }[] = [
  { id: 'lead', label: 'Lead', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { id: 'contacted', label: 'Contacted', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'interested', label: 'Interested', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'call_scheduled', label: 'Call Scheduled', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'onboarding', label: 'Onboarding', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  { id: 'live', label: 'Live', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
];

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: '#FEF2F2', text: '#DC2626' },
  B: { bg: '#FFF7ED', text: '#EA580C' },
  C: { bg: '#F9FAFB', text: '#6B7280' },
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
  const tier = TIER_COLORS[provider.tier] ?? TIER_COLORS.C!;
  const days = daysInStage(provider.entered_stage_at);
  const stage = STAGES.find((s) => s.id === provider.stage);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(provider.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(provider)}
      className="rounded-lg border cursor-pointer select-none transition-all hover:shadow-md active:opacity-70"
      style={{ background: '#fff', borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
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
          <span className="font-semibold text-sm text-gray-900 leading-tight">{provider.business_name}</span>
          <span
            className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded capitalize"
            style={{ background: '#EFF6FF', color: '#2563EB' }}
          >
            {provider.type}
          </span>
        </div>

        {/* Region */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span className="capitalize">{provider.region.replace('-', ' ')}</span>
        </div>

        {/* Tier + days */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: tier.bg, color: tier.text }}
          >
            Tier {provider.tier}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {days}d in {stage?.label ?? provider.stage}
          </span>
        </div>

        {/* Contact icons + rating */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {provider.phone && (
              <Phone className="w-3.5 h-3.5 text-gray-400" />
            )}
            {provider.phone && (
              <MessageSquare className="w-3.5 h-3.5 text-green-500" />
            )}
            <Mail className="w-3.5 h-3.5 text-gray-400" />
          </div>
          {provider.avg_rating && (
            <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
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
        className="rounded-xl w-full overflow-hidden flex flex-col"
        style={{ background: '#fff', maxWidth: 640, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{provider.business_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs capitalize text-gray-500">{provider.type}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 capitalize">{provider.region.replace('-', ' ')}</span>
              <span className="text-gray-300">·</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: TIER_COLORS[provider.tier]?.bg, color: TIER_COLORS[provider.tier]?.text }}
              >
                Tier {provider.tier}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Stage progress */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">PIPELINE STAGE</p>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGES.map((s, i) => {
                const isActive = s.id === provider.stage;
                const isPast = i < currentIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleMove(s.id)}
                    disabled={movingTo !== null}
                    className="text-xs px-2.5 py-1 rounded-full transition-all border"
                    style={{
                      background: isActive ? s.color : isPast ? '#F3F4F6' : '#fff',
                      color: isActive ? '#fff' : isPast ? '#9CA3AF' : '#374151',
                      borderColor: isActive ? s.color : '#E5E7EB',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {movingTo === s.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">CONTACT</p>
            <div className="flex gap-2 flex-wrap">
              {provider.phone && (
                <a
                  href={`tel:${provider.phone}`}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  {provider.phone}
                </a>
              )}
              {provider.phone && (
                <a
                  href={`https://wa.me/${provider.phone?.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
              {nextStage && (
                <button
                  onClick={() => handleMove(nextStage.id)}
                  disabled={movingTo !== null}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: nextStage.color, color: '#fff' }}
                >
                  {movingTo === nextStage.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowRight className="w-3.5 h-3.5" />}
                  Move to {nextStage.label}
                </button>
              )}
              {provider.stage !== 'live' ? null : (
                <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-green-700 bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live
                </span>
              )}
            </div>
          </div>

          {/* Contact history */}
          {provider.contact_history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">CONTACT HISTORY</p>
              <div className="space-y-2">
                {provider.contact_history.map((entry, i) => {
                  const Icon = contactIcon[entry.type];
                  return (
                    <div key={i} className="flex gap-2.5 text-sm">
                      <div className="mt-0.5 flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700">{entry.note}</span>
                        <span className="ml-2 text-xs text-gray-400">
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
            <p className="text-xs font-medium text-gray-500 mb-2">NOTES</p>
            {provider.notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {provider.notes.map((note) => (
                  <div key={note.id} className="rounded-lg p-3 text-sm" style={{ background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                    <p className="text-gray-700">{note.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                placeholder="Add a note..."
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || savingNote}
                className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                style={{ background: '#3B82F6', color: '#fff' }}
              >
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div>
              <span className="font-medium text-gray-700">Assigned to</span>
              <p>{provider.assigned_to || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Added</span>
              <p>{new Date(provider.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Days in stage</span>
              <p>{daysInStage(provider.entered_stage_at)} days</p>
            </div>
            {provider.avg_rating && (
              <div>
                <span className="font-medium text-gray-700">Rating</span>
                <p className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
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
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#F3F4F6' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Provider Onboarding Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track providers from lead to live</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterRegion || filterTier || filterType) && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#3B82F6' }}
            >
              <Plus className="w-4 h-4" />
              Add from Scraped
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-sm">
            <span className="text-gray-500">Total</span>
            <span className="ml-2 font-bold text-gray-900">{total}</span>
          </div>
          {STAGES.map((s) => (
            <div key={s.id} className="text-sm">
              <span style={{ color: s.color }} className="font-medium">{s.label}</span>
              <span className="ml-1.5 font-bold text-gray-900">{stageCounts[s.id] ?? 0}</span>
            </div>
          ))}
          <div className="text-sm ml-auto">
            <span className="text-gray-500">Conversion</span>
            <span className="ml-2 font-bold text-green-600">{conversionRate}%</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Avg days to live</span>
            <span className="ml-2 font-bold text-gray-900">{avgDaysToLive}d</span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
            >
              <option value="">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r.replace('-', ' ')}</option>
              ))}
            </select>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
            >
              <option value="">All tiers</option>
              <option value="A">Tier A</option>
              <option value="B">Tier B</option>
              <option value="C">Tier C</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none"
            >
              <option value="">All types</option>
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="tour">Tour</option>
              <option value="experience">Experience</option>
            </select>
            {(filterRegion || filterTier || filterType) && (
              <button
                onClick={() => { setFilterRegion(''); setFilterTier(''); setFilterType(''); }}
                className="text-sm text-red-500 hover:underline"
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
                className="flex flex-col rounded-xl flex-shrink-0 transition-all"
                style={{
                  width: 240,
                  background: isDropTarget ? stage.bg : '#ECEFF4',
                  border: `2px solid ${isDropTarget ? stage.color : 'transparent'}`,
                }}
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
                      className="rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-gray-400 py-6"
                      style={{ borderColor: stage.border }}
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
        className="rounded-xl w-full overflow-hidden flex flex-col"
        style={{ background: '#fff', maxWidth: 520, maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add from Scraped Listings</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-blue-400"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No listings found</p>
          ) : (
            filtered.slice(0, 30).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{l.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{l.type} · {l.region}</p>
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
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: '#3B82F6', color: '#fff' }}
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
