'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Send, MessageCircle, Mail, AtSign, Zap, RefreshCw,
  ChevronRight, Clock, CheckCircle2, XCircle, HelpCircle,
  AlertCircle, Filter, Inbox, LayoutGrid, Eye, Bot, Loader2,
  TrendingUp, Users, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutreachRecord {
  id: string;
  business_id: string;
  business_name: string;
  business_type: string;
  business_region: string;
  channel: 'whatsapp' | 'instagram' | 'email';
  status: 'queued' | 'sent' | 'delivered' | 'responded' | 'interested' | 'declined' | 'converted';
  message_text: string;
  response_text: string | null;
  response_classification: 'interested' | 'question' | 'not_interested' | 'uncertain' | null;
  sequence_step: number;
  sequence_name: string;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  notes: string;
}

interface Stats {
  total: number;
  queued: number;
  sent: number;
  responded: number;
  interested: number;
  converted: number;
  responseRate: number;
  conversionRate: number;
}

type ViewMode = 'kanban' | 'inbox';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function channelIcon(channel: string, size = 'w-3.5 h-3.5') {
  const cls = `${size} flex-shrink-0`;
  if (channel === 'whatsapp') return <MessageCircle className={cls} style={{ color: '#25D366' }} />;
  if (channel === 'instagram') return <AtSign className={cls} style={{ color: '#E1306C' }} />;
  return <Mail className={cls} style={{ color: '#3B82F6' }} />;
}

function classificationBadge(c: string | null) {
  if (!c) return null;
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    interested:    { bg: '#D1FAE5', text: '#065F46', label: 'Interesado',      icon: <CheckCircle2 className="w-3 h-3" /> },
    question:      { bg: '#DBEAFE', text: '#1E40AF', label: 'Pregunta',         icon: <HelpCircle className="w-3 h-3" /> },
    not_interested:{ bg: '#FEE2E2', text: '#991B1B', label: 'No Interesado',   icon: <XCircle className="w-3 h-3" /> },
    uncertain:     { bg: '#FEF3C7', text: '#92400E', label: 'Incierto',         icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[c];
  if (!s) return null;
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}>
      {s.icon}{s.label}
    </span>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({
  record,
  onSimulate,
  onUpdateStatus,
  simulating,
}: {
  record: OutreachRecord;
  onSimulate: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  simulating: string | null;
}) {
  const days = daysSince(record.sent_at ?? record.created_at);
  const isSim = simulating === record.id;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate capitalize">
            {record.business_name}
          </p>
          <p className="text-[11px] text-gray-400 capitalize">{record.business_type} · {record.business_region}</p>
        </div>
        {channelIcon(record.channel)}
      </div>

      {record.response_text && (
        <p className="text-[11px] text-gray-500 italic mt-1 mb-2 line-clamp-2 bg-gray-50 rounded-lg p-2">
          "{record.response_text}"
        </p>
      )}

      {record.response_classification && (
        <div className="mb-2">{classificationBadge(record.response_classification)}</div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="w-3 h-3" />
          {days === 0 ? 'Hoy' : `${days}d`}
          {record.sequence_step > 1 && (
            <span className="ml-1 bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 text-[9px]">
              Paso {record.sequence_step}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {(record.status === 'sent' || record.status === 'delivered') && (
            <button
              onClick={() => onSimulate(record.id)}
              disabled={isSim}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors disabled:opacity-50"
              title="Simular respuesta"
              aria-label={`Simulate response for ${record.business_name}`}
            >
              {isSim ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
              Simular
            </button>
          )}
          {record.status === 'responded' && record.response_classification === 'interested' && (
            <button
              onClick={() => onUpdateStatus(record.id, 'interested')}
              className="text-[10px] px-2 py-1 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
            >
              → Interesado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  title,
  color,
  records,
  onSimulate,
  onUpdateStatus,
  simulating,
}: {
  title: string;
  color: string;
  records: OutreachRecord[];
  onSimulate: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  simulating: string | null;
}) {
  return (
    <div className="flex-1 min-w-[220px] max-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-xs font-semibold text-gray-700">{title}</span>
        </div>
        <span className="text-xs text-gray-400 font-medium bg-gray-100 rounded-full px-2 py-0.5">
          {records.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {records.map((r) => (
          <KanbanCard
            key={r.id}
            record={r}
            onSimulate={onSimulate}
            onUpdateStatus={onUpdateStatus}
            simulating={simulating}
          />
        ))}
        {records.length === 0 && (
          <div className="text-center text-[11px] text-gray-300 py-8 border-2 border-dashed border-gray-100 rounded-xl">
            Sin registros
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inbox Item ───────────────────────────────────────────────────────────────

function InboxItem({
  record,
  expanded,
  onToggle,
  onSimulate,
  simulating,
  suggestedReply,
}: {
  record: OutreachRecord;
  expanded: boolean;
  onToggle: () => void;
  onSimulate: (id: string) => void;
  simulating: string | null;
  suggestedReply: string | null;
}) {
  const isSim = simulating === record.id;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset transition-colors text-left"
        aria-expanded={expanded}
        aria-label={`${record.business_name} outreach details`}
      >
        <div className="flex-shrink-0">{channelIcon(record.channel, 'w-4 h-4')}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 capitalize">{record.business_name}</span>
            {classificationBadge(record.response_classification)}
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {record.response_text ?? 'Sin respuesta aún'}
          </p>
        </div>
        <div className="flex-shrink-0 text-[10px] text-gray-400">
          {record.responded_at ? new Date(record.responded_at).toLocaleDateString('es-VE') : '—'}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Mensaje enviado</p>
            <p className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
              {record.message_text}
            </p>
          </div>

          {record.response_text && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Respuesta recibida</p>
              <p className="text-xs text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-100">
                {record.response_text}
              </p>
            </div>
          )}

          {suggestedReply && (
            <div>
              <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Bot className="w-3 h-3" /> Respuesta sugerida por IA
              </p>
              <p className="text-xs text-gray-700 bg-purple-50 rounded-lg p-3 border border-purple-100">
                {suggestedReply}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!record.response_text && (
              <button
                onClick={() => onSimulate(record.id)}
                disabled={isSim}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isSim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                Simular Respuesta
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [simulating, setSimulating] = useState<string | null>(null);
  const [expandedInbox, setExpandedInbox] = useState<string | null>(null);
  const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({});
  const [inboxFilter, setInboxFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/outreach?limit=200');
    const data = await res.json();
    setRecords(data.records ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSimulate = async (id: string) => {
    setSimulating(id);
    try {
      const res = await fetch('/api/admin/outreach/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreach_id: id, simulate: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestedReplies((prev) => ({ ...prev, [id]: data.suggested_reply }));
        await load();
      }
    } finally {
      setSimulating(null);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  // Group records for Kanban
  const queued    = records.filter((r) => r.status === 'queued');
  const sent      = records.filter((r) => r.status === 'sent' || r.status === 'delivered');
  const responded = records.filter((r) => r.status === 'responded');
  const interested= records.filter((r) => r.status === 'interested');
  const converted = records.filter((r) => r.status === 'converted');
  const followUp  = records.filter((r) => r.sequence_step > 1 && r.status === 'sent');

  // Inbox
  const inboxRecords = records.filter((r) => {
    if (inboxFilter === 'responded') return r.status === 'responded';
    if (inboxFilter === 'interested') return r.response_classification === 'interested';
    if (inboxFilter === 'question') return r.response_classification === 'question';
    if (inboxFilter === 'not_interested') return r.response_classification === 'not_interested';
    return true;
  }).filter((r) => channelFilter === 'all' || r.channel === channelFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Outreach CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pipeline de socios fundadores VZ Explorer</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/outreach/sequences"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            <Zap className="w-3.5 h-3.5" /> Secuencias
          </Link>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-8 gap-3">
          {[
            { label: 'En pipeline', value: stats.total, color: '#6B7280', icon: <Users className="w-4 h-4" /> },
            { label: 'En cola', value: stats.queued, color: '#8B5CF6', icon: <Clock className="w-4 h-4" /> },
            { label: 'Enviados', value: stats.sent, color: '#3B82F6', icon: <Send className="w-4 h-4" /> },
            { label: 'Respondidos', value: stats.responded, color: '#F59E0B', icon: <MessageCircle className="w-4 h-4" /> },
            { label: 'Interesados', value: stats.interested, color: '#10B981', icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: 'Convertidos', value: stats.converted, color: '#EF4444', icon: <Check className="w-4 h-4" /> },
            { label: 'Tasa respuesta', value: `${stats.responseRate}%`, color: '#6366F1', icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Tasa conversión', value: `${stats.conversionRate}%`, color: '#EC4899', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView('kanban')}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: view === 'kanban' ? '#fff' : 'transparent',
            color: view === 'kanban' ? '#1F2937' : '#9CA3AF',
            boxShadow: view === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
        </button>
        <button
          onClick={() => setView('inbox')}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: view === 'inbox' ? '#fff' : 'transparent',
            color: view === 'inbox' ? '#1F2937' : '#9CA3AF',
            boxShadow: view === 'inbox' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Inbox className="w-3.5 h-3.5" /> Bandeja
          {records.filter((r) => r.status === 'responded').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
              {records.filter((r) => r.status === 'responded').length}
            </span>
          )}
        </button>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumn
            title="Cola"
            color="#8B5CF6"
            records={queued}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
          <KanbanColumn
            title="Enviado"
            color="#3B82F6"
            records={sent.filter((r) => r.sequence_step === 1)}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
          <KanbanColumn
            title="Seguimiento"
            color="#6366F1"
            records={followUp}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
          <KanbanColumn
            title="Respondido"
            color="#F59E0B"
            records={responded}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
          <KanbanColumn
            title="Interesado"
            color="#10B981"
            records={interested}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
          <KanbanColumn
            title="Convertido"
            color="#EF4444"
            records={converted}
            onSimulate={handleSimulate}
            onUpdateStatus={handleUpdateStatus}
            simulating={simulating}
          />
        </div>
      )}

      {/* Inbox View */}
      {view === 'inbox' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Filtrar:</span>
            </div>
            <div className="flex gap-1">
              {['all', 'responded', 'interested', 'question', 'not_interested'].map((f) => (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className="text-xs px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    background: inboxFilter === f ? '#3B82F6' : '#F3F4F6',
                    color: inboxFilter === f ? '#fff' : '#6B7280',
                  }}
                >
                  {f === 'all' ? 'Todos' :
                   f === 'responded' ? 'Respondidos' :
                   f === 'interested' ? 'Interesados' :
                   f === 'question' ? 'Preguntas' : 'No interesados'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-2">
              {['all', 'whatsapp', 'instagram', 'email'].map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    background: channelFilter === c ? '#1F2937' : '#F3F4F6',
                    color: channelFilter === c ? '#fff' : '#6B7280',
                  }}
                >
                  {c !== 'all' && channelIcon(c, 'w-3 h-3')}
                  {c === 'all' ? 'Todos' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {inboxRecords.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay registros con estos filtros</p>
              </div>
            )}
            {inboxRecords.map((r) => (
              <InboxItem
                key={r.id}
                record={r}
                expanded={expandedInbox === r.id}
                onToggle={() => setExpandedInbox(expandedInbox === r.id ? null : r.id)}
                onSimulate={handleSimulate}
                simulating={simulating}
                suggestedReply={suggestedReplies[r.id] ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
