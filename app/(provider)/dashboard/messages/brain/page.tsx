'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Brain, Home, BedDouble, Sparkles, HelpCircle,
  CreditCard, MapPin, ChevronDown, ChevronUp,
  Plus, Trash2, Save, Eye, EyeOff, CheckCircle2, AlertCircle,
  TrendingUp, Upload, BookOpen, Loader2,
} from 'lucide-react';
import type { TrainingImportRecord } from '@/types/database';
import { formatKnowledge } from '@/lib/whatsapp-ai';
import type { PosadaKnowledge, RoomType, FaqPair, PosadaPolicies, PricingRules } from '@/types/database';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const AMENITY_OPTIONS = [
  'WiFi', 'Pool', 'Air conditioning', 'Hot water', 'Parking', 'Breakfast included',
  'Kitchen access', 'BBQ area', 'Garden', 'Ocean view', 'Mountain view', 'River access',
  'TV', 'Washer/dryer', 'Safe box', 'Towels & linens', 'Pets welcome',
  '24h reception', 'Generator / inverter', 'Water filter', 'Hammocks', 'Terrace',
];

const PAYMENT_OPTIONS = [
  'Cash (USD)', 'Cash (Bs.)', 'Zelle', 'USDT (Tether)', 'Binance', 'Bank transfer',
  'Visa/Mastercard', 'PayPal',
];

const LANGUAGE_OPTIONS = [
  'Spanish', 'English', 'Portuguese', 'French', 'Italian', 'German',
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, badge, complete, children, defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  complete?: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        className="w-full text-left"
        onClick={() => setOpen((o) => !o)}
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
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
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

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

// ─── Room builder ─────────────────────────────────────────────────────────────

function RoomBuilder({
  rooms, onChange,
}: { rooms: RoomType[]; onChange: (rooms: RoomType[]) => void }) {
  const add = () => onChange([...rooms, { name: '', capacity: 2, price_usd: 0, description: '', amenities: [] }]);
  const remove = (i: number) => onChange(rooms.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<RoomType>) =>
    onChange(rooms.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  return (
    <div className="space-y-4">
      {rooms.map((room, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Room {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room name" hint="e.g. Suite Caribeña">
              <Input value={room.name} onChange={(v) => update(i, { name: v })} placeholder="Suite Caribeña" />
            </Field>
            <Field label="Max guests">
              <input
                type="number"
                min={1} max={20}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={room.capacity}
                onChange={(e) => update(i, { capacity: parseInt(e.target.value) || 1 })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price per night (USD)">
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={room.price_usd}
                onChange={(e) => update(i, { price_usd: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <Field label="Description" hint="Bed type, view, size, what makes it special">
            <Textarea
              value={room.description}
              onChange={(v) => update(i, { description: v })}
              placeholder="Cama king, vista al jardín, baño privado con ducha de lluvia..."
              rows={2}
            />
          </Field>
          <Field label="Room-specific inclusions" hint="What's included for this room specifically">
            <Input
              value={room.amenities.join(', ')}
              onChange={(v) => update(i, { amenities: v.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="Desayuno, minibar, acceso a piscina"
            />
          </Field>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add Room Type
      </Button>
    </div>
  );
}

// ─── FAQ builder ──────────────────────────────────────────────────────────────

function FaqBuilder({ faqs, onChange }: { faqs: FaqPair[]; onChange: (faqs: FaqPair[]) => void }) {
  const add = () => onChange([...faqs, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(faqs.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<FaqPair>) =>
    onChange(faqs.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const SUGGESTIONS = [
    { question: '¿Incluye el desayuno?', answer: '' },
    { question: '¿Tienen estacionamiento?', answer: '' },
    { question: '¿A qué distancia están de la playa?', answer: '' },
    { question: 'Do you have airport transfers?', answer: '' },
    { question: '¿Aceptan niños?', answer: '' },
    { question: '¿Cuál es la política de cancelación?', answer: '' },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Q&amp;A {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Field label="Question">
            <Input value={faq.question} onChange={(v) => update(i, { question: v })} placeholder="¿Incluye el desayuno?" />
          </Field>
          <Field label="Answer">
            <Textarea value={faq.answer} onChange={(v) => update(i, { answer: v })} placeholder="Sí, ofrecemos desayuno continental incluido en la tarifa..." rows={2} />
          </Field>
        </div>
      ))}
      {faqs.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Common questions to get you started:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.question}
                onClick={() => onChange([...faqs, s])}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                + {s.question}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add Q&amp;A
      </Button>
    </div>
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

// ─── Training import section ──────────────────────────────────────────────────

type ImportStage = 'idle' | 'uploading' | 'complete' | 'error';

interface ImportStats {
  turns_parsed: number;
  pairs_found: number;
  lessons_extracted: number;
  lessons_stored: number;
  lessons_skipped: number;
  provider_name_detected: string;
  tone_profile_extracted: boolean;
}

function TrainingSection({ onImportDone }: { onImportDone?: () => void }) {
  const [stage, setStage] = useState<ImportStage>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [providerName, setProviderName] = useState('');
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<TrainingImportRecord[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load import history from posada_knowledge
  useEffect(() => {
    fetch('/api/whatsapp/knowledge')
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.training_imports) {
          setHistory(res.data.training_imports as TrainingImportRecord[]);
        }
      })
      .catch(() => {});
  }, [stage]); // re-fetch after each import

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.txt')) {
      setErrorMsg('Please upload a .txt WhatsApp export file.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('File is too large (max 10MB).');
      return;
    }
    setFile(f);
    setErrorMsg('');
  };

  const handleImport = async () => {
    if (!file) return;
    setStage('uploading');

    const fd = new FormData();
    fd.append('file', file);
    if (providerName.trim()) fd.append('provider_name', providerName.trim());

    try {
      const res = await fetch('/api/whatsapp/import', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Import failed. Try again.');
        setStage('error');
        return;
      }

      setStats(data as ImportStats);
      setStage('complete');
      setFile(null);
      setProviderName('');
      onImportDone?.();
    } catch {
      setErrorMsg('Network error. Check your connection and try again.');
      setStage('error');
    }
  };

  const reset = () => {
    setStage('idle');
    setFile(null);
    setStats(null);
    setErrorMsg('');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Upload a WhatsApp chat export (.txt) from your existing guest conversations.
        The AI will extract Q&amp;A pairs and learn from the way you actually talk to guests.
      </p>

      {/* Stage: idle / uploading */}
      {(stage === 'idle' || stage === 'error') && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              file && 'border-primary/40 bg-primary/5'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              type="file"
              accept=".txt"
              className="hidden"
              ref={fileRef}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              id="whatsapp-import-input"
            />
            {file ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">Drop your WhatsApp export here</p>
                <p className="text-xs text-muted-foreground">or click to browse — .txt files only, max 10MB</p>
              </div>
            )}
          </div>

          {/* How to export instructions */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors">How to export from WhatsApp</summary>
            <div className="mt-2 space-y-1 pl-3 border-l border-border">
              <p><strong>iOS:</strong> Open a chat → tap name at top → Scroll down → &ldquo;Export Chat&rdquo; → &ldquo;Without Media&rdquo;</p>
              <p><strong>Android:</strong> Open a chat → three dots → More → Export Chat → Without Media</p>
              <p>Send the .txt file to yourself (email, notes) and upload it here.</p>
            </div>
          </details>

          {/* Provider name hint */}
          <Field
            label="Your name in WhatsApp (optional)"
            hint="Helps the AI know which messages are yours. If blank, the most active sender is assumed to be you."
          >
            <Input
              value={providerName}
              onChange={setProviderName}
              placeholder="María Posada, Hotel El Saco, etc."
            />
          </Field>

          {errorMsg && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!file}
              className="flex-1"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Extract Lessons
            </Button>
            {stage === 'error' && (
              <Button size="sm" variant="outline" onClick={reset}>Try Again</Button>
            )}
          </div>
        </div>
      )}

      {/* Stage: uploading / processing */}
      {stage === 'uploading' && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Processing your conversation history...</p>
          <p className="text-xs">This takes 30–90 seconds depending on conversation length.</p>
        </div>
      )}

      {/* Stage: complete */}
      {stage === 'complete' && stats && (
        <div className="space-y-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Import complete!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-foreground">{stats.turns_parsed}</div>
                <div className="text-muted-foreground">Messages parsed</div>
              </div>
              <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-foreground">{stats.pairs_found}</div>
                <div className="text-muted-foreground">Q&amp;A pairs found</div>
              </div>
              <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-primary">{stats.lessons_stored}</div>
                <div className="text-muted-foreground">Lessons added</div>
              </div>
              <div className="bg-white dark:bg-black/20 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-foreground">{stats.lessons_skipped}</div>
                <div className="text-muted-foreground">Duplicates skipped</div>
              </div>
            </div>
            {stats.tone_profile_extracted && (
              <p className="text-xs text-green-700 dark:text-green-400">
                Tone profile detected — AI will mirror your communication style.
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={reset}>
            Import Another File
          </Button>
        </div>
      )}

      {/* Import history */}
      {history.length > 0 && stage !== 'complete' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past imports</p>
          <div className="space-y-1">
            {history.slice(-5).reverse().map((rec, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-mono truncate max-w-[160px]">{rec.filename}</span>
                <span className="text-muted-foreground">{rec.qa_pairs_count} lessons · {new Date(rec.imported_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [providerName, setProviderName] = useState('Your Posada');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/whatsapp/knowledge').then((r) => r.json()),
      fetch('/api/providers/me').then((r) => r.json()),
    ]).then(([kRes, pRes]) => {
      if (kRes.data) setKnowledge(kRes.data);
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
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('Failed to save');
      }
    } finally {
      setSaving(null);
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
          <Section icon={<Home className="w-4 h-4" />} title="Property Overview" badge="Who you are & your vibe" complete={sectionComplete.overview} defaultOpen>
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
          <Section icon={<BedDouble className="w-4 h-4" />} title="Rooms & Rates" badge="Room types, prices, capacity" complete={sectionComplete.rooms}>
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
          <Section icon={<Sparkles className="w-4 h-4" />} title="Amenities" badge="What's available at the property" complete={sectionComplete.amenities}>
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
          <Section icon={<AlertCircle className="w-4 h-4" />} title="Policies" badge="Check-in, cancellation, rules" complete={sectionComplete.policies}>
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
          <Section icon={<HelpCircle className="w-4 h-4" />} title="FAQ Builder" badge="Questions guests always ask" complete={sectionComplete.faqs}>
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
          <Section icon={<CreditCard className="w-4 h-4" />} title="Booking & Payment" badge="How guests book and pay" complete={sectionComplete.booking}>
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
          <Section icon={<MapPin className="w-4 h-4" />} title="Local Tips & Attractions" badge="Beaches, restaurants, activities nearby" complete={sectionComplete.local} >
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

          {/* § 9 · Training Data */}
          <Section
            icon={<BookOpen className="w-4 h-4" />}
            title="Training Data"
            badge="Learn from past WhatsApp conversations"
          >
            <TrainingSection onImportDone={() => void 0} />
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
