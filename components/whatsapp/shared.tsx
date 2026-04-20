'use client';

/**
 * Shared UI primitives for WhatsApp agent pages (settings, brain, setup wizard).
 * Extracted from AiSettingsPanel.tsx and brain/page.tsx to avoid duplication.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Copy, Eye, EyeOff, CheckCircle2, Save, RefreshCw,
  X, Plus, Trash2,
} from 'lucide-react';
import type { RoomType, FaqPair } from '@/types/database';

// ─── Form primitives ─────────────────────────────────────────────────────────

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

export function SharedTextarea({ value, onChange, placeholder, rows = 3 }: {
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

export function SharedInput({ value, onChange, placeholder, type = 'text' }: {
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

// ─── Settings layout ─────────────────────────────────────────────────────────

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

export function SettingRow({ label, hint, children, last = false }: {
  label: string; hint?: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      {!last && <Separator />}
    </>
  );
}

// ─── Selection components ────────────────────────────────────────────────────

export function OptionCards<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description: string; example?: string }[];
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'w-full text-left p-3 rounded-xl border-2 transition-all',
            value === opt.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/40'
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
              value === opt.value ? 'border-primary' : 'border-border'
            )}>
              {value === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', value === opt.value ? 'text-primary' : 'text-foreground')}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              {opt.example && value === opt.value && (
                <p className="text-xs italic text-muted-foreground mt-1.5 bg-muted/40 px-2 py-1 rounded-md">
                  &ldquo;{opt.example}&rdquo;
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
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

export function TagInput({ tags, onChange, placeholder }: {
  tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim().toLowerCase();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg border bg-muted/20">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-destructive transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={tags.length === 0 ? placeholder : '+ add more'}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {input && (
        <Button size="sm" variant="outline" onClick={add} className="h-6 text-xs px-2">
          Add &ldquo;{input}&rdquo;
        </Button>
      )}
    </div>
  );
}

// ─── Display / Action components ─────────────────────────────────────────────

export function CopyField({ value, label, masked }: { value: string; label: string; masked?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = masked && !visible ? '•'.repeat(Math.min(value.length, 32)) : value;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono truncate text-foreground">
          {display || '—'}
        </code>
        {masked && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setVisible((v) => !v)}>
            {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={copy}>
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function SaveButton({
  onClick, saving, disabled,
}: { onClick: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <Button size="sm" onClick={onClick} disabled={saving || disabled} className="gap-1.5">
      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

// ─── Knowledge builders ──────────────────────────────────────────────────────

export function RoomBuilder({
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
              <SharedInput value={room.name} onChange={(v) => update(i, { name: v })} placeholder="Suite Caribeña" />
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
            <SharedTextarea
              value={room.description}
              onChange={(v) => update(i, { description: v })}
              placeholder="Cama king, vista al jardín, baño privado con ducha de lluvia..."
              rows={2}
            />
          </Field>
          <Field label="Room-specific inclusions" hint="What's included for this room specifically">
            <SharedInput
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

export function FaqBuilder({ faqs, onChange }: { faqs: FaqPair[]; onChange: (faqs: FaqPair[]) => void }) {
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
            <SharedInput value={faq.question} onChange={(v) => update(i, { question: v })} placeholder="¿Incluye el desayuno?" />
          </Field>
          <Field label="Answer">
            <SharedTextarea value={faq.answer} onChange={(v) => update(i, { answer: v })} placeholder="Sí, ofrecemos desayuno continental incluido en la tarifa..." rows={2} />
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

// ─── Constants (shared across pages) ─────────────────────────────────────────

export const AMENITY_OPTIONS = [
  'WiFi', 'Pool', 'Air conditioning', 'Hot water', 'Parking', 'Breakfast included',
  'Kitchen access', 'BBQ area', 'Garden', 'Ocean view', 'Mountain view', 'River access',
  'TV', 'Washer/dryer', 'Safe box', 'Towels & linens', 'Pets welcome',
  '24h reception', 'Generator / inverter', 'Water filter', 'Hammocks', 'Terrace',
];

export const PAYMENT_OPTIONS = [
  'Cash (USD)', 'Cash (Bs.)', 'Zelle', 'USDT (Tether)', 'Binance', 'Bank transfer',
  'Visa/Mastercard', 'PayPal',
];

export const LANGUAGE_OPTIONS = [
  'Spanish', 'English', 'Portuguese', 'French', 'Italian', 'German',
];

export const DEFAULT_HOURS = {
  mon: { active: true,  start: '09:00', end: '21:00' },
  tue: { active: true,  start: '09:00', end: '21:00' },
  wed: { active: true,  start: '09:00', end: '21:00' },
  thu: { active: true,  start: '09:00', end: '21:00' },
  fri: { active: true,  start: '09:00', end: '22:00' },
  sat: { active: true,  start: '08:00', end: '22:00' },
  sun: { active: true,  start: '08:00', end: '21:00' },
};
