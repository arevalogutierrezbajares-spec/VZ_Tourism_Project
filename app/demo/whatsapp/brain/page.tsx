'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Brain, Home, BedDouble, HelpCircle, CreditCard,
  MapPin, ChevronDown, ChevronUp, Plus, Trash2, Save,
  Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, Loader2,
} from 'lucide-react';
import { formatKnowledge } from '@/lib/whatsapp-ai';
import DemoSidebar from '@/components/whatsapp/DemoSidebar';
import type { PosadaKnowledge, RoomType, FaqPair } from '@/types/database';

// ─── Shared primitives ────────────────────────────────────────────────────────

function Section({ icon, title, badge, complete, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; badge?: string;
  complete?: boolean; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button className="w-full text-left" onClick={() => setOpen((o) => !o)}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                complete ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
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
      {open && (<><Separator /><CardContent className="pt-4 pb-5">{children}</CardContent></>)}
    </Card>
  );
}

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
      rows={rows} value={value}
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
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
      selected
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
    )}>{label}</button>
  );
}

function SaveBtn({ section, saving, onClick }: { section: string; saving: string | null; onClick: () => void }) {
  const isSaving = saving === section;
  return (
    <div className="flex justify-end">
      <Button size="sm" onClick={onClick} disabled={isSaving}>
        {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

// ─── Room builder ─────────────────────────────────────────────────────────────

function RoomBuilder({ rooms, onChange }: { rooms: RoomType[]; onChange: (r: RoomType[]) => void }) {
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
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room name">
              <Input value={room.name} onChange={(v) => update(i, { name: v })} placeholder="Suite Caribeña" />
            </Field>
            <Field label="Max guests">
              <input type="number" min={1} max={20}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={room.capacity} onChange={(e) => update(i, { capacity: parseInt(e.target.value) || 1 })} />
            </Field>
          </div>
          <Field label="Price per night (USD)">
            <input type="number" min={0}
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={room.price_usd} onChange={(e) => update(i, { price_usd: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="Description" hint="Bed type, view, what makes it special">
            <Textarea value={room.description} onChange={(v) => update(i, { description: v })}
              placeholder="Cama king, vista al jardín, baño privado..." rows={2} />
          </Field>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Room Type
      </Button>
    </div>
  );
}

// ─── FAQ builder ──────────────────────────────────────────────────────────────

function FaqBuilder({ faqs, onChange }: { faqs: FaqPair[]; onChange: (f: FaqPair[]) => void }) {
  const add = () => onChange([...faqs, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(faqs.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<FaqPair>) =>
    onChange(faqs.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const SUGGESTIONS = [
    '¿Incluye el desayuno?', '¿Tienen estacionamiento?', '¿A qué distancia están de la playa?',
    'Do you have airport transfers?', '¿Aceptan niños?', '¿Cuál es la política de cancelación?',
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Q&amp;A {i + 1}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Field label="Question">
            <Input value={faq.question} onChange={(v) => update(i, { question: v })} placeholder="¿Incluye el desayuno?" />
          </Field>
          <Field label="Answer">
            <Textarea value={faq.answer} onChange={(v) => update(i, { answer: v })}
              placeholder="Sí, ofrecemos desayuno continental incluido en la tarifa..." rows={2} />
          </Field>
        </div>
      ))}
      {faqs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => onChange([...faqs, { question: s, answer: '' }])}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Q&amp;A
      </Button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AMENITY_OPTIONS = [
  'WiFi', 'Pool', 'Air conditioning', 'Hot water', 'Parking', 'Breakfast included',
  'Kitchen access', 'BBQ area', 'Garden', 'Ocean view', 'Mountain view',
  'TV', 'Washer/dryer', 'Generator / inverter', 'Hammocks', 'Terrace',
];

const PAYMENT_OPTIONS = [
  'Cash (USD)', 'Cash (Bs.)', 'Zelle', 'USDT (Tether)', 'Binance', 'Bank transfer', 'Visa/Mastercard', 'PayPal',
];

const LANGUAGE_OPTIONS = ['Spanish', 'English', 'Portuguese', 'French', 'Italian', 'German'];

const EMPTY: Omit<PosadaKnowledge, 'id' | 'provider_id' | 'created_at' | 'updated_at'> = {
  property_description: '', location_details: '', room_types: [], amenities: [],
  policies: {}, faqs: [], booking_process: '', payment_methods: [],
  nearby_attractions: '', languages_spoken: [], special_notes: '',
  pricing_rules: { seasonal_periods: [], weekend_premium: 0, long_stay_discounts: [], quote_currency: 'USD' },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DemoBrainPage() {
  const [k, setK] = useState<typeof EMPTY>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ section: string; ok: boolean } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const LS_KEY = 'demo_posada_knowledge';

  useEffect(() => {
    // Try API first, fall back to localStorage
    fetch('/api/demo/whatsapp/knowledge')
      .then((r) => r.json())
      .then(({ data }) => { if (data) setK(data); })
      .catch(() => {
        try {
          const cached = localStorage.getItem(LS_KEY);
          if (cached) setK(JSON.parse(cached));
        } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (section: string, patch: Partial<typeof EMPTY>) => {
    setSaving(section);
    try {
      const res = await fetch('/api/demo/whatsapp/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const { data, error } = await res.json();
      if (res.ok && data) {
        setK((prev) => {
          const merged = { ...prev, ...data };
          try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
          return merged;
        });
        setFlash({ section, ok: true });
      } else {
        // API failed — save to localStorage as fallback
        console.warn('API save failed, using localStorage:', error);
        setK((prev) => {
          const merged = { ...prev, ...patch };
          try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
          return merged;
        });
        setFlash({ section, ok: true });
      }
    } catch {
      // Network error — save to localStorage
      setK((prev) => {
        const merged = { ...prev, ...patch };
        try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      });
      setFlash({ section, ok: true });
    } finally {
      setSaving(null);
      setTimeout(() => setFlash(null), 2500);
    }
  }, []);

  const complete = {
    overview:  !!(k.property_description),
    rooms:     k.room_types.length > 0,
    amenities: k.amenities.length > 0,
    policies:  Object.keys(k.policies ?? {}).length > 0,
    faqs:      k.faqs.length > 0,
    booking:   !!(k.booking_process) || k.payment_methods.length > 0,
    local:     !!(k.nearby_attractions),
  };

  const completedCount = Object.values(complete).filter(Boolean).length;
  const totalSections = Object.keys(complete).length;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-muted/10">
        <DemoSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      <DemoSidebar />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">Demo — Posada El Sol</Badge>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6" /> AI Brain
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Fill in your property details — Sofía will use this in every WhatsApp reply.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)} className="gap-1.5">
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? 'Hide preview' : 'Preview prompt'}
          </Button>
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
              <div className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / totalSections) * 100}%` }} />
            </div>
            {completedCount < totalSections && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                The more you fill in, the more accurately Sofía answers guests.
              </p>
            )}
          </CardContent>
        </Card>

        <div className={cn(showPreview ? 'grid grid-cols-2 gap-6 items-start' : 'space-y-4')}>
          <div className="space-y-4">

            {/* § 1 · Overview */}
            <Section icon={<Home className="w-4 h-4" />} title="Property Overview"
              badge="Who you are & your vibe" complete={complete.overview} defaultOpen>
              <div className="space-y-4">
                <Field label="Property description"
                  hint="History, vibe, what makes it special. The AI mirrors this tone.">
                  <Textarea value={k.property_description ?? ''} rows={5}
                    onChange={(v) => setK((p) => ({ ...p, property_description: v }))}
                    placeholder="Somos una posada familiar fundada en 1998, ubicada en el corazón de Mochima. Nuestro estilo es relajado y auténtico — nada de lujos innecesarios, solo comodidad y contacto directo con la naturaleza..." />
                </Field>
                <Field label="Location & how to get here"
                  hint="Address, directions, nearby landmarks. Guests ask this constantly.">
                  <Textarea value={k.location_details ?? ''} rows={3}
                    onChange={(v) => setK((p) => ({ ...p, location_details: v }))}
                    placeholder="Estamos en Mochima, Sucre. A 10 min en lancha de Playa El Saco. Aeropuerto más cercano: Cumaná (CUM), 45 min en carro..." />
                </Field>
                {flash?.section === 'overview' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved — Sofía will use this in her next reply.' : 'Save failed. Try again.'}
                  </p>
                )}
                <SaveBtn section="overview" saving={saving}
                  onClick={() => save('overview', { property_description: k.property_description, location_details: k.location_details })} />
              </div>
            </Section>

            {/* § 2 · Rooms */}
            <Section icon={<BedDouble className="w-4 h-4" />} title="Rooms & Rates"
              badge="Room types, prices, capacity" complete={complete.rooms}>
              <div className="space-y-4">
                <RoomBuilder rooms={k.room_types ?? []} onChange={(room_types) => setK((p) => ({ ...p, room_types }))} />
                {flash?.section === 'rooms' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved — Sofía can now quote accurate prices.' : 'Save failed. Try again.'}
                  </p>
                )}
                <SaveBtn section="rooms" saving={saving}
                  onClick={() => save('rooms', { room_types: k.room_types })} />
              </div>
            </Section>

            {/* § 3 · Amenities */}
            <Section icon={<Sparkles className="w-4 h-4" />} title="Amenities"
              badge="What's available at the property" complete={complete.amenities}>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((a) => (
                    <ToggleChip key={a} label={a} selected={k.amenities.includes(a)}
                      onClick={() => setK((p) => ({
                        ...p,
                        amenities: p.amenities.includes(a) ? p.amenities.filter((x) => x !== a) : [...p.amenities, a],
                      }))} />
                  ))}
                </div>
                {flash?.section === 'amenities' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved.' : 'Save failed.'}
                  </p>
                )}
                <SaveBtn section="amenities" saving={saving}
                  onClick={() => save('amenities', { amenities: k.amenities })} />
              </div>
            </Section>

            {/* § 4 · Policies */}
            <Section icon={<AlertCircle className="w-4 h-4" />} title="Policies"
              badge="Check-in, cancellation, rules" complete={complete.policies}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Check-in time">
                    <Input value={k.policies?.check_in ?? ''} placeholder="3:00 PM"
                      onChange={(v) => setK((p) => ({ ...p, policies: { ...p.policies, check_in: v } }))} />
                  </Field>
                  <Field label="Check-out time">
                    <Input value={k.policies?.check_out ?? ''} placeholder="11:00 AM"
                      onChange={(v) => setK((p) => ({ ...p, policies: { ...p.policies, check_out: v } }))} />
                  </Field>
                </div>
                <Field label="Cancellation policy">
                  <Textarea value={k.policies?.cancellation ?? ''} rows={2}
                    onChange={(v) => setK((p) => ({ ...p, policies: { ...p.policies, cancellation: v } }))}
                    placeholder="Cancelación gratuita hasta 7 días antes. 50% de penalización entre 7 y 3 días..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Pets">
                    <Input value={k.policies?.pets ?? ''} placeholder="Permitidas con aviso"
                      onChange={(v) => setK((p) => ({ ...p, policies: { ...p.policies, pets: v } }))} />
                  </Field>
                  <Field label="Extra guest fee">
                    <Input value={k.policies?.extra_guest_fee ?? ''} placeholder="$15/persona adicional"
                      onChange={(v) => setK((p) => ({ ...p, policies: { ...p.policies, extra_guest_fee: v } }))} />
                  </Field>
                </div>
                {flash?.section === 'policies' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved.' : 'Save failed.'}
                  </p>
                )}
                <SaveBtn section="policies" saving={saving}
                  onClick={() => save('policies', { policies: k.policies })} />
              </div>
            </Section>

            {/* § 5 · FAQs */}
            <Section icon={<HelpCircle className="w-4 h-4" />} title="FAQ Builder"
              badge="Questions guests always ask" complete={complete.faqs}>
              <div className="space-y-4">
                <FaqBuilder faqs={k.faqs ?? []} onChange={(faqs) => setK((p) => ({ ...p, faqs }))} />
                {flash?.section === 'faqs' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved — Sofía now has scripted answers for common questions.' : 'Save failed.'}
                  </p>
                )}
                <SaveBtn section="faqs" saving={saving}
                  onClick={() => save('faqs', { faqs: k.faqs })} />
              </div>
            </Section>

            {/* § 6 · Booking & Payment */}
            <Section icon={<CreditCard className="w-4 h-4" />} title="Booking & Payment"
              badge="How guests book and pay" complete={complete.booking}>
              <div className="space-y-4">
                <Field label="How to book" hint="What info you need, what happens after inquiry">
                  <Textarea value={k.booking_process ?? ''} rows={3}
                    onChange={(v) => setK((p) => ({ ...p, booking_process: v }))}
                    placeholder="Para reservar envíanos tus fechas, número de personas y tipo de habitación. Confirmamos disponibilidad en menos de 2 horas. Requerimos 50% de depósito para confirmar..." />
                </Field>
                <Field label="Payment methods accepted">
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map((p) => (
                      <ToggleChip key={p} label={p} selected={k.payment_methods.includes(p)}
                        onClick={() => setK((prev) => ({
                          ...prev,
                          payment_methods: prev.payment_methods.includes(p)
                            ? prev.payment_methods.filter((x) => x !== p)
                            : [...prev.payment_methods, p],
                        }))} />
                    ))}
                  </div>
                </Field>
                {flash?.section === 'booking' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved.' : 'Save failed.'}
                  </p>
                )}
                <SaveBtn section="booking" saving={saving}
                  onClick={() => save('booking', { booking_process: k.booking_process, payment_methods: k.payment_methods })} />
              </div>
            </Section>

            {/* § 7 · Local Tips */}
            <Section icon={<MapPin className="w-4 h-4" />} title="Local Tips & Attractions"
              badge="Beaches, restaurants, transport nearby" complete={complete.local}>
              <div className="space-y-4">
                <Field label="Nearby attractions & tips"
                  hint="Beaches, restaurants, tours, transport — distances and honest opinions">
                  <Textarea value={k.nearby_attractions ?? ''} rows={5}
                    onChange={(v) => setK((p) => ({ ...p, nearby_attractions: v }))}
                    placeholder="Playa El Saco: 5 min en lancha, la más tranquila de la zona. Restaurante Don Pedro: el mejor pabellón de la región, a 10 min caminando..." />
                </Field>
                <Field label="Languages spoken by staff">
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <ToggleChip key={l} label={l} selected={k.languages_spoken.includes(l)}
                        onClick={() => setK((p) => ({
                          ...p,
                          languages_spoken: p.languages_spoken.includes(l)
                            ? p.languages_spoken.filter((x) => x !== l)
                            : [...p.languages_spoken, l],
                        }))} />
                    ))}
                  </div>
                </Field>
                <Field label="Special notes" hint="Anything else Sofía should know">
                  <Textarea value={k.special_notes ?? ''} rows={2}
                    onChange={(v) => setK((p) => ({ ...p, special_notes: v }))}
                    placeholder="Cortes de luz aprox. 4h/día — tenemos generador. WiFi estable pero señal celular limitada..." />
                </Field>
                {flash?.section === 'local' && (
                  <p className={cn('text-xs flex items-center gap-1', flash.ok ? 'text-green-600' : 'text-destructive')}>
                    <CheckCircle2 className="w-3 h-3" />
                    {flash.ok ? 'Saved.' : 'Save failed.'}
                  </p>
                )}
                <SaveBtn section="local" saving={saving}
                  onClick={() => save('local', { nearby_attractions: k.nearby_attractions, languages_spoken: k.languages_spoken, special_notes: k.special_notes })} />
              </div>
            </Section>

          </div>

          {/* Preview panel */}
          {showPreview && (
            <div className="sticky top-6 h-fit">
              <Card>
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">What Sofía sees</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This block is injected into every system prompt before Sofía replies.
                  </p>
                </CardHeader>
                <CardContent className="p-4 max-h-[75vh] overflow-y-auto">
                  {formatKnowledge(k as PosadaKnowledge, 'Posada El Sol').trim() ? (
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
                      {formatKnowledge(k as PosadaKnowledge, 'Posada El Sol')}
                    </pre>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Brain className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      Fill in the sections to see what Sofía knows.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
