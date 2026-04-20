'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Brain, Home, BedDouble, Sparkles, HelpCircle,
  CreditCard, MapPin, ChevronDown, ChevronUp,
  Plus, Trash2, Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  TrendingUp, RefreshCw,
} from 'lucide-react';
import { formatKnowledge } from '@/lib/whatsapp-ai';
import type { PosadaKnowledge, RoomType, FaqPair, PosadaPolicies, PricingRules } from '@/types/database';
import toast from 'react-hot-toast';
import {
  Field, SharedTextarea as Textarea, SharedInput as Input,
  ToggleChip, RoomBuilder, FaqBuilder,
  AMENITY_OPTIONS, PAYMENT_OPTIONS, LANGUAGE_OPTIONS,
} from '@/components/whatsapp/shared';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, badge, complete, isDirty, children, defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  complete?: boolean;
  isDirty?: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function handleToggle() {
    if (open && isDirty) {
      // Warn user about unsaved changes before collapsing
      const confirmed = window.confirm('You have unsaved changes. Collapse without saving?');
      if (!confirmed) return;
    }
    setOpen((o) => !o);
  }

  return (
    <Card>
      <button
        className="w-full text-left"
        onClick={handleToggle}
      >
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                complete ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
              )}>
                {complete ? <CheckCircle2 className="w-4 h-4" /> : icon}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                  {isDirty && open && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Unsaved
                    </span>
                  )}
                </div>
                {badge && <p className="text-xs text-muted-foreground mt-0.5">{badge}</p>}
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
      </button>
      {open && (
        <>
          <Separator />
          <CardContent className="pt-4 pb-5">{children}</CardContent>
        </>
      )}
    </Card>
  );
}

// ─── Pricing rules builder ────────────────────────────────────────────────────

const VZ_SEASON_PRESETS = [
  {
    name: 'Carnaval',
    dates: [{ start: '2026-02-13', end: '2026-02-17' }],
    multiplier: 1.3,
  },
  {
    name: 'Semana Santa',
    dates: [{ start: '2026-03-29', end: '2026-04-05' }],
    multiplier: 1.35,
  },
  {
    name: 'Navidad / Año Nuevo',
    dates: [{ start: '2025-12-20', end: '2026-01-05' }],
    multiplier: 1.4,
  },
  {
    name: 'Vacaciones de Julio',
    dates: [{ start: '2026-07-01', end: '2026-07-31' }],
    multiplier: 1.2,
  },
];

function PricingBuilder({
  rules, onChange,
}: { rules: PricingRules; onChange: (r: PricingRules) => void }) {
  const seasons = rules.seasonal_periods ?? [];
  const longStay = rules.long_stay_discounts ?? [];

  const addPreset = (preset: typeof VZ_SEASON_PRESETS[number]) => {
    const already = seasons.some((s) => s.name === preset.name);
    if (already) return;
    onChange({ ...rules, seasonal_periods: [...seasons, preset] });
  };

  const removeSeason = (i: number) =>
    onChange({ ...rules, seasonal_periods: seasons.filter((_, idx) => idx !== i) });

  const updateSeason = (i: number, patch: Partial<(typeof seasons)[number]>) =>
    onChange({
      ...rules,
      seasonal_periods: seasons.map((s, idx) => idx === i ? { ...s, ...patch } : s),
    });

  const addLongStay = () =>
    onChange({ ...rules, long_stay_discounts: [...longStay, { nights: 7, discount: 0.1 }] });

  const removeLongStay = (i: number) =>
    onChange({ ...rules, long_stay_discounts: longStay.filter((_, idx) => idx !== i) });

  const updateLongStay = (i: number, patch: Partial<(typeof longStay)[number]>) =>
    onChange({
      ...rules,
      long_stay_discounts: longStay.map((d, idx) => idx === i ? { ...d, ...patch } : d),
    });

  return (
    <div className="space-y-6">
      {/* Peak seasons */}
      <div className="space-y-3">
        <Field label="Peak season periods" hint="AI will automatically quote higher rates during these windows">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {VZ_SEASON_PRESETS.map((p) => {
              const active = seasons.some((s) => s.name === p.name);
              return (
                <button
                  key={p.name}
                  onClick={() => active
                    ? onChange({ ...rules, seasonal_periods: seasons.filter((s) => s.name !== p.name) })
                    : addPreset(p)
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                  )}
                >
                  {active ? '✓ ' : '+ '}{p.name}
                </button>
              );
            })}
          </div>

          {seasons.length > 0 && (
            <div className="space-y-2">
              {seasons.map((season, i) => (
                <div key={i} className="rounded-lg border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{season.name}</span>
                    <button onClick={() => removeSeason(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="From">
                      <input
                        type="date"
                        className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={season.dates[0]?.start ?? ''}
                        onChange={(e) => updateSeason(i, { dates: [{ start: e.target.value, end: season.dates[0]?.end ?? '' }] })}
                      />
                    </Field>
                    <Field label="To">
                      <input
                        type="date"
                        className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={season.dates[0]?.end ?? ''}
                        onChange={(e) => updateSeason(i, { dates: [{ start: season.dates[0]?.start ?? '', end: e.target.value }] })}
                      />
                    </Field>
                    <Field label="Price uplift">
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={100} step={5}
                          className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={Math.round((season.multiplier - 1) * 100)}
                          onChange={(e) => updateSeason(i, { multiplier: 1 + (parseInt(e.target.value) || 0) / 100 })}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => onChange({
            ...rules,
            seasonal_periods: [...seasons, { name: 'Custom Period', dates: [{ start: '', end: '' }], multiplier: 1.2 }],
          })}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add custom period
          </Button>
        </Field>
      </div>

      {/* Weekend premium */}
      <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Weekend premium</p>
            <p className="text-xs text-muted-foreground">Higher rates on Friday & Saturday nights</p>
          </div>
          <button
            onClick={() => onChange({ ...rules, weekend_premium: rules.weekend_premium ? 0 : 0.15 })}
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative',
              (rules.weekend_premium ?? 0) > 0 ? 'bg-primary' : 'bg-muted border'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              (rules.weekend_premium ?? 0) > 0 ? 'left-4' : 'left-0.5'
            )} />
          </button>
        </div>
        {(rules.weekend_premium ?? 0) > 0 && (
          <div className="flex items-center gap-3">
            <input
              type="range" min={5} max={50} step={5}
              className="flex-1 accent-primary"
              value={Math.round((rules.weekend_premium ?? 0) * 100)}
              onChange={(e) => onChange({ ...rules, weekend_premium: parseInt(e.target.value) / 100 })}
            />
            <span className="text-sm font-medium w-12 text-right">+{Math.round((rules.weekend_premium ?? 0) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Long-stay discounts */}
      <div className="space-y-3">
        <Field label="Long-stay discounts" hint="Encourage multi-week bookings with automatic discounts">
          <div className="space-y-2 mt-1">
            {longStay.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number" min={2} max={90}
                    className="w-20 rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={d.nights}
                    onChange={(e) => updateLongStay(i, { nights: parseInt(e.target.value) || 2 })}
                  />
                  <span className="text-sm text-muted-foreground">nights →</span>
                  <input
                    type="number" min={1} max={50}
                    className="w-20 rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={Math.round(d.discount * 100)}
                    onChange={(e) => updateLongStay(i, { discount: (parseInt(e.target.value) || 0) / 100 })}
                  />
                  <span className="text-sm text-muted-foreground">% off</span>
                </div>
                <button onClick={() => removeLongStay(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLongStay}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add discount tier
            </Button>
          </div>
        </Field>
      </div>

      {/* Last-minute discount */}
      <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Last-minute discount</p>
            <p className="text-xs text-muted-foreground">Discount for bookings close to arrival date</p>
          </div>
          <button
            onClick={() => onChange({
              ...rules,
              last_minute_discount: rules.last_minute_discount
                ? undefined
                : { days_before: 3, discount: 0.15 },
            })}
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative',
              rules.last_minute_discount ? 'bg-primary' : 'bg-muted border'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              rules.last_minute_discount ? 'left-4' : 'left-0.5'
            )} />
          </button>
        </div>
        {rules.last_minute_discount && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Within how many days">
              <input
                type="number" min={1} max={30}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={rules.last_minute_discount.days_before}
                onChange={(e) => onChange({
                  ...rules,
                  last_minute_discount: { ...rules.last_minute_discount!, days_before: parseInt(e.target.value) || 1 },
                })}
              />
            </Field>
            <Field label="Discount (%)">
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={50}
                  className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={Math.round(rules.last_minute_discount.discount * 100)}
                  onChange={(e) => onChange({
                    ...rules,
                    last_minute_discount: { ...rules.last_minute_discount!, discount: (parseInt(e.target.value) || 0) / 100 },
                  })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Currency preference */}
      <Field label="Quote currency" hint="How the AI quotes prices to guests">
        <div className="flex gap-2">
          {(['USD', 'Bs', 'both'] as const).map((c) => (
            <ToggleChip
              key={c}
              label={c === 'USD' ? '$ USD only' : c === 'Bs' ? 'Bs. only' : 'USD + Bs'}
              selected={(rules.quote_currency ?? 'USD') === c}
              onClick={() => onChange({ ...rules, quote_currency: c })}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── Preview panel ────────────────────────────────────────────────────────────

function PreviewPanel({ knowledge, providerName }: { knowledge: PosadaKnowledge; providerName: string }) {
  const formatted = formatKnowledge(knowledge, providerName);
  if (!formatted.trim()) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <Brain className="w-8 h-8 mx-auto mb-3 opacity-30" />
        Fill in the sections to see what the AI knows.
      </div>
    );
  }
  return (
    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
      {formatted}
    </pre>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EMPTY_PRICING_RULES: PricingRules = {
  seasonal_periods: [],
  weekend_premium: 0,
  long_stay_discounts: [],
  last_minute_discount: undefined,
  quote_currency: 'USD',
};

const EMPTY_KNOWLEDGE: Omit<PosadaKnowledge, 'id' | 'provider_id' | 'created_at' | 'updated_at'> = {
  property_description: '',
  location_details: '',
  room_types: [],
  amenities: [],
  policies: {},
  faqs: [],
  booking_process: '',
  payment_methods: [],
  nearby_attractions: '',
  languages_spoken: [],
  special_notes: '',
  pricing_rules: EMPTY_PRICING_RULES,
};

export default function BrainPage() {
  const [knowledge, setKnowledge] = useState<typeof EMPTY_KNOWLEDGE>(EMPTY_KNOWLEDGE);
  const [savedKnowledge, setSavedKnowledge] = useState<typeof EMPTY_KNOWLEDGE>(EMPTY_KNOWLEDGE);
  const [providerName, setProviderName] = useState('Your Posada');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/whatsapp/knowledge').then((r) => r.json()),
      fetch('/api/providers/me').then((r) => r.json()),
    ]).then(([kRes, pRes]) => {
      if (kRes.data) {
        setKnowledge(kRes.data);
        setSavedKnowledge(kRes.data);
      }
      if (pRes.data?.business_name) setProviderName(pRes.data.business_name);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Save section ───────────────────────────────────────────────────────────
  const save = useCallback(async (section: string, patch: Partial<typeof EMPTY_KNOWLEDGE>) => {
    setSaving(section);
    setSaved(false);
    try {
      const res = await fetch('/api/whatsapp/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const { data } = await res.json() as { data: PosadaKnowledge };
        setKnowledge((prev) => ({ ...prev, ...data }));
        setSavedKnowledge((prev) => ({ ...prev, ...data }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSaving(null);
    }
  }, []);

  // ── Sync from PMS ─────────────────────────────────────────────────────────
  const syncFromPms = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/knowledge/sync-pms', { method: 'POST' });
      if (res.ok) {
        const { data, synced_fields } = await res.json();
        if (data) setKnowledge((prev) => ({ ...prev, ...data }));
        toast.success(`Synced: ${(synced_fields as string[]).join(', ')}`);
      } else {
        toast.error('Could not connect to PMS');
      }
    } catch {
      toast.error('PMS sync failed');
    } finally {
      setSyncing(false);
    }
  }, []);

  // ── Section complete checks ────────────────────────────────────────────────
  const pr = knowledge.pricing_rules ?? {};
  const sectionComplete = {
    overview:    !!(knowledge.property_description),
    rooms:       knowledge.room_types.length > 0,
    amenities:   knowledge.amenities.length > 0,
    policies:    Object.keys(knowledge.policies ?? {}).length > 0,
    faqs:        knowledge.faqs.length > 0,
    booking:     !!(knowledge.booking_process) || knowledge.payment_methods.length > 0,
    local:       !!(knowledge.nearby_attractions),
    pricing:     !!(
      (pr.seasonal_periods && pr.seasonal_periods.length > 0) ||
      (pr.weekend_premium && pr.weekend_premium > 0) ||
      (pr.long_stay_discounts && pr.long_stay_discounts.length > 0) ||
      pr.last_minute_discount
    ),
  };

  const completedCount = Object.values(sectionComplete).filter(Boolean).length;
  const totalSections = Object.keys(sectionComplete).length;

  // ── Dirty flags per section ────────────────────────────────────────────────
  const sectionDirty = {
    overview: knowledge.property_description !== savedKnowledge.property_description ||
              knowledge.location_details !== savedKnowledge.location_details,
    rooms:    JSON.stringify(knowledge.room_types) !== JSON.stringify(savedKnowledge.room_types),
    amenities: JSON.stringify(knowledge.amenities) !== JSON.stringify(savedKnowledge.amenities),
    policies: JSON.stringify(knowledge.policies) !== JSON.stringify(savedKnowledge.policies),
    faqs:     JSON.stringify(knowledge.faqs) !== JSON.stringify(savedKnowledge.faqs),
    booking:  knowledge.booking_process !== savedKnowledge.booking_process ||
              JSON.stringify(knowledge.payment_methods) !== JSON.stringify(savedKnowledge.payment_methods) ||
              JSON.stringify(knowledge.languages_spoken) !== JSON.stringify(savedKnowledge.languages_spoken),
    local:    knowledge.nearby_attractions !== savedKnowledge.nearby_attractions ||
              knowledge.special_notes !== savedKnowledge.special_notes,
    pricing:  JSON.stringify(knowledge.pricing_rules) !== JSON.stringify(savedKnowledge.pricing_rules),
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="h-16 animate-pulse bg-muted/50 rounded-lg" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI Brain
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Everything your AI concierge knows about your property.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={syncFromPms}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing…' : 'Sync from PMS'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((p) => !p)}
            className="gap-1.5"
          >
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Knowledge completeness</p>
            <Badge variant={completedCount === totalSections ? 'default' : 'secondary'}>
              {completedCount}/{totalSections} sections
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalSections) * 100}%` }}
            />
          </div>
          {completedCount < totalSections && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              The more you fill in, the better your AI concierge performs.
            </p>
          )}
        </CardContent>
      </Card>

      <div className={cn('gap-6', showPreview ? 'grid grid-cols-2' : 'space-y-4')}>
        {/* Left: form sections */}
        <div className="space-y-4">

          {/* § 1 · Overview */}
          <Section icon={<Home className="w-4 h-4" />} title="Property Overview" badge="Who you are & your vibe" complete={sectionComplete.overview} isDirty={sectionDirty.overview} defaultOpen>
            <div className="space-y-4">
              <Field label="Property description" hint="Tell the story of your place. Vibe, history, what makes it special. The AI will use this to set the tone.">
                <Textarea
                  value={knowledge.property_description ?? ''}
                  onChange={(v) => setKnowledge((k) => ({ ...k, property_description: v }))}
                  placeholder="Somos una posada familiar fundada en 1998, ubicada en el corazón de Mochima. Nuestro estilo es relajado y auténtico — nada de lujos innecesarios, solo comodidad y contacto directo con la naturaleza..."
                  rows={5}
                />
              </Field>
              <Field label="Location & how to get here" hint="Address, directions, nearby landmarks. Guests ask this constantly.">
                <Textarea
                  value={knowledge.location_details ?? ''}
                  onChange={(v) => setKnowledge((k) => ({ ...k, location_details: v }))}
                  placeholder="Estamos en Mochima, Sucre. A 10 minutos en lancha de la playa Mochima. El aeropuerto más cercano es Cumaná (CUM), a 45 minutos en carro..."
                  rows={4}
                />
              </Field>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('overview', { property_description: knowledge.property_description, location_details: knowledge.location_details })} disabled={saving === 'overview'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'overview' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 2 · Rooms */}
          <Section icon={<BedDouble className="w-4 h-4" />} title="Rooms & Rates" badge="Room types, prices, capacity" complete={sectionComplete.rooms} isDirty={sectionDirty.rooms}>
            <div className="space-y-4">
              <RoomBuilder rooms={knowledge.room_types ?? []} onChange={(room_types) => setKnowledge((k) => ({ ...k, room_types }))} />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('rooms', { room_types: knowledge.room_types })} disabled={saving === 'rooms'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'rooms' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 3 · Amenities */}
          <Section icon={<Sparkles className="w-4 h-4" />} title="Amenities" badge="What's available at the property" complete={sectionComplete.amenities} isDirty={sectionDirty.amenities}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <ToggleChip
                    key={a}
                    label={a}
                    selected={knowledge.amenities.includes(a)}
                    onClick={() => setKnowledge((k) => ({
                      ...k,
                      amenities: k.amenities.includes(a)
                        ? k.amenities.filter((x) => x !== a)
                        : [...k.amenities, a],
                    }))}
                  />
                ))}
              </div>
              <Field label="Other amenities not listed above">
                <Input
                  value={knowledge.amenities.filter((a) => !AMENITY_OPTIONS.includes(a)).join(', ')}
                  onChange={(v) => {
                    const extras = v.split(',').map((s) => s.trim()).filter(Boolean);
                    const standard = knowledge.amenities.filter((a) => AMENITY_OPTIONS.includes(a));
                    setKnowledge((k) => ({ ...k, amenities: [...standard, ...extras] }));
                  }}
                  placeholder="Kayaks, snorkeling equipment, yoga deck..."
                />
              </Field>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('amenities', { amenities: knowledge.amenities })} disabled={saving === 'amenities'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'amenities' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 4 · Policies */}
          <Section icon={<AlertCircle className="w-4 h-4" />} title="Policies" badge="Check-in, cancellation, rules" complete={sectionComplete.policies} isDirty={sectionDirty.policies}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Check-in time">
                  <Input value={knowledge.policies?.check_in ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, check_in: v } }))} placeholder="3:00 PM" />
                </Field>
                <Field label="Check-out time">
                  <Input value={knowledge.policies?.check_out ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, check_out: v } }))} placeholder="11:00 AM" />
                </Field>
                <Field label="Minimum stay (nights)">
                  <input
                    type="number" min={1}
                    className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={knowledge.policies?.min_stay_nights ?? ''}
                    onChange={(e) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, min_stay_nights: parseInt(e.target.value) || undefined } }))}
                    placeholder="2"
                  />
                </Field>
                <Field label="Deposit required (%)">
                  <input
                    type="number" min={0} max={100}
                    className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={knowledge.policies?.deposit_percent ?? ''}
                    onChange={(e) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, deposit_percent: parseInt(e.target.value) || undefined } }))}
                    placeholder="50"
                  />
                </Field>
              </div>
              <Field label="Cancellation policy">
                <Textarea value={knowledge.policies?.cancellation ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, cancellation: v } }))} placeholder="Cancelación gratuita hasta 7 días antes. 50% de penalización entre 7 y 3 días. No reembolsable a menos de 72 horas..." rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pets policy">
                  <Input value={knowledge.policies?.pets ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, pets: v } }))} placeholder="Permitidas con aviso previo" />
                </Field>
                <Field label="Smoking policy">
                  <Input value={knowledge.policies?.smoking ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, smoking: v } }))} placeholder="No se permite fumar en interiores" />
                </Field>
              </div>
              <Field label="Extra guest fee">
                <Input value={knowledge.policies?.extra_guest_fee ?? ''} onChange={(v) => setKnowledge((k) => ({ ...k, policies: { ...k.policies, extra_guest_fee: v } }))} placeholder="$15/persona adicional por noche" />
              </Field>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('policies', { policies: knowledge.policies })} disabled={saving === 'policies'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'policies' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 5 · FAQs */}
          <Section icon={<HelpCircle className="w-4 h-4" />} title="FAQ Builder" badge="Questions guests always ask" complete={sectionComplete.faqs} isDirty={sectionDirty.faqs}>
            <div className="space-y-4">
              <FaqBuilder faqs={knowledge.faqs ?? []} onChange={(faqs) => setKnowledge((k) => ({ ...k, faqs }))} />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('faqs', { faqs: knowledge.faqs })} disabled={saving === 'faqs'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'faqs' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 6 · Booking process */}
          <Section icon={<CreditCard className="w-4 h-4" />} title="Booking & Payment" badge="How guests book and pay" complete={sectionComplete.booking} isDirty={sectionDirty.booking}>
            <div className="space-y-4">
              <Field label="How to book" hint="Describe the booking process — what info you need, what happens next">
                <Textarea
                  value={knowledge.booking_process ?? ''}
                  onChange={(v) => setKnowledge((k) => ({ ...k, booking_process: v }))}
                  placeholder="Para reservar envíanos tus fechas, número de personas y tipo de habitación. Te confirmamos disponibilidad en menos de 2 horas. Requerimos 50% de depósito para confirmar..."
                  rows={3}
                />
              </Field>
              <Field label="Payment methods accepted">
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((p) => (
                    <ToggleChip
                      key={p}
                      label={p}
                      selected={knowledge.payment_methods.includes(p)}
                      onClick={() => setKnowledge((k) => ({
                        ...k,
                        payment_methods: k.payment_methods.includes(p)
                          ? k.payment_methods.filter((x) => x !== p)
                          : [...k.payment_methods, p],
                      }))}
                    />
                  ))}
                </div>
              </Field>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('booking', { booking_process: knowledge.booking_process, payment_methods: knowledge.payment_methods })} disabled={saving === 'booking'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'booking' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 7 · Local tips */}
          <Section icon={<MapPin className="w-4 h-4" />} title="Local Tips & Attractions" badge="Beaches, restaurants, activities nearby" complete={sectionComplete.local} isDirty={sectionDirty.local}>
            <div className="space-y-4">
              <Field label="Nearby attractions & tips" hint="Beaches, restaurants, tours, transport — distances and honest opinions">
                <Textarea
                  value={knowledge.nearby_attractions ?? ''}
                  onChange={(v) => setKnowledge((k) => ({ ...k, nearby_attractions: v }))}
                  placeholder="Playa El Saco: 5 min en lancha, la más tranquila de la zona. Restaurante Don Pedro: el mejor pabellón de la región, a 10 minutos caminando. Tour de snorkeling: lo ofrecemos nosotros, $30/persona..."
                  rows={5}
                />
              </Field>
              <Field label="Languages spoken by staff">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <ToggleChip
                      key={l}
                      label={l}
                      selected={knowledge.languages_spoken.includes(l)}
                      onClick={() => setKnowledge((k) => ({
                        ...k,
                        languages_spoken: k.languages_spoken.includes(l)
                          ? k.languages_spoken.filter((x) => x !== l)
                          : [...k.languages_spoken, l],
                      }))}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Special notes" hint="Anything else your AI should know">
                <Textarea
                  value={knowledge.special_notes ?? ''}
                  onChange={(v) => setKnowledge((k) => ({ ...k, special_notes: v }))}
                  placeholder="Los cortes de luz duran aprox. 4 horas al día — tenemos generador. La señal de celular es limitada pero hay WiFi estable..."
                  rows={3}
                />
              </Field>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save('local', { nearby_attractions: knowledge.nearby_attractions, languages_spoken: knowledge.languages_spoken, special_notes: knowledge.special_notes })} disabled={saving === 'local'}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'local' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

          {/* § 8 · Dynamic Pricing */}
          <Section
            icon={<TrendingUp className="w-4 h-4" />}
            title="Dynamic Pricing"
            badge="Seasonal rates, weekend uplift, discounts"
            complete={sectionComplete.pricing}
            isDirty={sectionDirty.pricing}
          >
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                Configure your pricing rules here. The AI concierge will automatically quote
                the correct adjusted price to guests based on their travel dates — no manual
                updates needed.
              </p>
              <PricingBuilder
                rules={knowledge.pricing_rules ?? EMPTY_PRICING_RULES}
                onChange={(pricing_rules) => setKnowledge((k) => ({ ...k, pricing_rules }))}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => save('pricing', { pricing_rules: knowledge.pricing_rules })}
                  disabled={saving === 'pricing'}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving === 'pricing' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Section>

        </div>

        {/* Right: preview panel */}
        {showPreview && (
          <div className="sticky top-6 h-fit">
            <Card>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">What the AI sees</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is injected into every system prompt.
                </p>
              </CardHeader>
              <CardContent className="p-4 max-h-[70vh] overflow-y-auto">
                <PreviewPanel knowledge={knowledge as PosadaKnowledge} providerName={providerName} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
