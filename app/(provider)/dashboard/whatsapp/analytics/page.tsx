'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useProviderStore } from '@/stores/provider-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MessageCircle, Bot, User, AlertTriangle,
  Clock, Globe, TrendingUp, BarChart3,
} from 'lucide-react';

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  aiMessages: number;
  humanMessages: number;
  inboundMessages: number;
  escalations: number;
  escalationRate: number;
  avgResponseTime: string;
  topLanguages: { lang: string; count: number }[];
  topEscalationReasons: { reason: string; count: number }[];
  conversationsByStatus: { status: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, max, color = 'bg-primary' }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const supabase = createClient();
  const { provider } = useProviderStore();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider?.id) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id]);

  async function loadAnalytics() {
    if (!provider?.id) return;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [convRes, msgRes, escRes] = await Promise.all([
      supabase
        .from('wa_conversations')
        .select('id, status, created_at')
        .eq('provider_id', provider.id),
      supabase
        .from('wa_messages')
        .select('id, role, is_ai, detected_lang, created_at, conversation_id')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('wa_escalations')
        .select('id, conversation_id, reason, trigger_type, created_at')
        .gte('created_at', thirtyDaysAgo),
    ]);

    const convs = convRes.data ?? [];
    const convIds = new Set(convs.map((c) => c.id));

    // Filter messages to only this provider's conversations
    const allMsgs = (msgRes.data ?? []).filter((m) => convIds.has(m.conversation_id));
    const escs = (escRes.data ?? []).filter((e) => {
      // escalations don't have provider_id, match via conversation_id
      return convIds.has(e.conversation_id);
    });

    const aiMsgs = allMsgs.filter((m) => m.role === 'outbound' && m.is_ai);
    const humanMsgs = allMsgs.filter((m) => m.role === 'outbound' && !m.is_ai);
    const inbound = allMsgs.filter((m) => m.role === 'inbound');

    // Languages
    const langCounts = new Map<string, number>();
    for (const m of inbound) {
      if (m.detected_lang) {
        langCounts.set(m.detected_lang, (langCounts.get(m.detected_lang) ?? 0) + 1);
      }
    }
    const topLanguages = [...langCounts.entries()]
      .map(([lang, count]) => ({ lang, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Escalation reasons
    const reasonCounts = new Map<string, number>();
    for (const e of escs) {
      const short = e.reason?.slice(0, 60) ?? 'Unknown';
      reasonCounts.set(short, (reasonCounts.get(short) ?? 0) + 1);
    }
    const topEscalationReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Conversations by status
    const statusCounts = new Map<string, number>();
    for (const c of convs) {
      statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
    }
    const conversationsByStatus = [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }));

    // Messages per day (last 14 days)
    const dayCounts = new Map<string, number>();
    for (const m of allMsgs) {
      const day = m.created_at.split('T')[0];
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
    const messagesPerDay = [...dayCounts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    // Avg response time (time between inbound and next outbound)
    let totalResponseMs = 0;
    let responseCount = 0;
    for (let i = 0; i < allMsgs.length - 1; i++) {
      if (allMsgs[i].role === 'inbound' && allMsgs[i + 1].role === 'outbound') {
        const diff = new Date(allMsgs[i + 1].created_at).getTime() - new Date(allMsgs[i].created_at).getTime();
        if (diff > 0 && diff < 3600000) { // under 1h
          totalResponseMs += diff;
          responseCount++;
        }
      }
    }
    const avgMs = responseCount > 0 ? totalResponseMs / responseCount : 0;
    const avgSec = Math.round(avgMs / 1000);
    const avgResponseTime = avgSec < 60
      ? `${avgSec}s`
      : avgSec < 3600
      ? `${Math.round(avgSec / 60)}m`
      : `${Math.round(avgSec / 3600)}h`;

    const escalationRate = inbound.length > 0
      ? Math.round((escs.length / inbound.length) * 100)
      : 0;

    setAnalytics({
      totalConversations: convs.length,
      totalMessages: allMsgs.length,
      aiMessages: aiMsgs.length,
      humanMessages: humanMsgs.length,
      inboundMessages: inbound.length,
      escalations: escs.length,
      escalationRate,
      avgResponseTime: avgResponseTime || '—',
      topLanguages,
      topEscalationReasons,
      conversationsByStatus,
      messagesPerDay,
    });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <Link href="/dashboard/whatsapp">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Analíticas WhatsApp</h1>
          <p className="text-muted-foreground text-sm">Últimos 30 días</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<MessageCircle className="w-4 h-4 text-primary" />}
              label="Conversaciones"
              value={analytics.totalConversations}
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-primary" />}
              label="Mensajes totales"
              value={analytics.totalMessages}
              sub={`${analytics.inboundMessages} entrantes`}
            />
            <StatCard
              icon={<Bot className="w-4 h-4 text-primary" />}
              label="Respuestas AI"
              value={analytics.aiMessages}
              sub={analytics.totalMessages > 0 ? `${Math.round((analytics.aiMessages / (analytics.aiMessages + analytics.humanMessages)) * 100)}% automatizado` : undefined}
            />
            <StatCard
              icon={<User className="w-4 h-4 text-primary" />}
              label="Respuestas humanas"
              value={analytics.humanMessages}
            />
            <StatCard
              icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
              label="Escalaciones"
              value={analytics.escalations}
              sub={`${analytics.escalationRate}% tasa`}
            />
            <StatCard
              icon={<Clock className="w-4 h-4 text-primary" />}
              label="Tiempo respuesta"
              value={analytics.avgResponseTime}
              sub="promedio"
            />
            <StatCard
              icon={<Globe className="w-4 h-4 text-primary" />}
              label="Idiomas"
              value={analytics.topLanguages.length}
              sub={analytics.topLanguages.map((l) => l.lang.toUpperCase()).join(', ') || '—'}
            />
            <StatCard
              icon={<BarChart3 className="w-4 h-4 text-primary" />}
              label="Por estado"
              value={analytics.conversationsByStatus.map((s) => `${s.count} ${s.status}`).join(', ') || '—'}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Messages per day */}
            {analytics.messagesPerDay.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Mensajes por día</p>
                  <div className="space-y-1.5">
                    {analytics.messagesPerDay.map((d) => (
                      <BarRow
                        key={d.date}
                        label={new Date(d.date + 'T00:00:00').toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                        value={d.count}
                        max={Math.max(...analytics.messagesPerDay.map((x) => x.count))}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top languages */}
            {analytics.topLanguages.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Idiomas detectados</p>
                  <div className="space-y-1.5">
                    {analytics.topLanguages.map((l) => (
                      <BarRow
                        key={l.lang}
                        label={l.lang.toUpperCase()}
                        value={l.count}
                        max={analytics.topLanguages[0].count}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top escalation reasons */}
            {analytics.topEscalationReasons.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Razones de escalación</p>
                  <div className="space-y-1.5">
                    {analytics.topEscalationReasons.map((r) => (
                      <BarRow
                        key={r.reason}
                        label={r.reason}
                        value={r.count}
                        max={analytics.topEscalationReasons[0].count}
                        color="bg-destructive"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
