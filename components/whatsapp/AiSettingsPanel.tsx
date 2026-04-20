'use client';

/**
 * AiSettingsPanel — full AI concierge control panel.
 * Used by both the authenticated dashboard page and the demo page.
 *
 * Props:
 *   initialConfig  — pre-loaded config (demo passes mock; real page fetches from API)
 *   onSave         — async fn called with partial config on each save action
 *   isDemo         — shows amber demo banner, disables network calls
 *   siteUrl        — used to build the webhook URL (defaults to window.location.origin)
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  Bot, Zap, MessageSquare, Shield, Clock, Wrench, Plug,
  Copy, Eye, EyeOff, CheckCircle2, AlertCircle, Save,
  Plus, X, FlaskConical, TrendingUp, Sparkles,
  Phone, RefreshCw, ChevronRight, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  PosadaWhatsappConfig, WaToneFormality, WaToneLanguage,
  WaResponseLength, WaBookingPressure, WaEmojiStyle,
  WaGreetingStyle, WaWorkingHours,
} from '@/types/database';
import {
  SectionHeader, SettingRow, OptionCards, TagInput,
  CopyField, SaveButton, DEFAULT_HOURS,
} from '@/components/whatsapp/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiConfig = Omit<PosadaWhatsappConfig, 'id' | 'provider_id' | 'created_at' | 'updated_at'>;

type Tab = 'status' | 'persona' | 'communication' | 'rules' | 'availability' | 'instructions' | 'connection';

interface AiSettingsPanelProps {
  initialConfig: AiConfig;
  onSave?: (patch: Partial<AiConfig>) => Promise<void>;
  isDemo?: boolean;
  siteUrl?: string;
}

// ─── Default config ───────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, icon, label, badge, onClick }: {
  active: boolean; icon: React.ReactNode; label: string;
  badge?: string | number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      <span className="w-4 h-4 shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function StatusTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const stats = [
    { label: 'AI-handled today',     value: '—', color: 'text-green-600'  },
    { label: 'Escalation rate',       value: '—', color: 'text-amber-600'  },
    { label: 'Avg response time',     value: '—', color: 'text-blue-600'   },
    { label: 'Open conversations',    value: '—', color: 'text-foreground' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Status"
        description="Master control for your WhatsApp AI concierge."
      />

      {/* Big on/off card */}
      <div className={cn(
        'rounded-2xl border-2 p-6 transition-all',
        cfg.ai_enabled ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-border bg-muted/30'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
              cfg.ai_enabled ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-muted text-muted-foreground'
            )}>
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {cfg.ai_enabled ? 'AI Concierge is active' : 'AI Concierge is paused'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {cfg.ai_enabled
                  ? `Responding as ${cfg.persona_name || 'Asistente'} · ${cfg.tone_language === 'es' ? 'Spanish' : cfg.tone_language === 'en' ? 'English' : 'Bilingual'}`
                  : 'All messages will be held for manual response.'}
              </p>
            </div>
          </div>
          <Switch
            checked={cfg.ai_enabled}
            onCheckedChange={async (v) => {
              onChange({ ai_enabled: v });
              await onSave({ ai_enabled: v });
              toast.success(v ? 'AI concierge activated' : 'AI paused — manual mode');
            }}
          />
        </div>

        {cfg.ai_enabled && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            <span className="text-xs bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-full text-muted-foreground">
              Persona: {cfg.persona_name || 'Asistente'}
            </span>
            <span className="text-xs bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-full text-muted-foreground">
              {cfg.tone_formality.charAt(0).toUpperCase() + cfg.tone_formality.slice(1)} tone
            </span>
            <span className="text-xs bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-full text-muted-foreground">
              {cfg.response_length} replies
            </span>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4 text-center">
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Live stats require a connected Supabase instance. Configure your AI persona, tone, and escalation rules
          using the panels on the left to maximise conversion and guest satisfaction.
        </p>
      </div>
    </div>
  );
}

function PersonaTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const [local, setLocal] = useState({
    persona_name: cfg.persona_name,
    persona_bio: cfg.persona_bio ?? '',
    greeting_style: cfg.greeting_style,
    custom_greeting: cfg.custom_greeting ?? '',
  });

  const previewGreeting = () => {
    if (local.greeting_style === 'custom' && local.custom_greeting) return local.custom_greeting;
    if (local.greeting_style === 'professional') {
      return `Good day! My name is ${local.persona_name || 'Asistente'}. I'm here to assist you with any questions about our property and to help you make a reservation. How can I help you today?`;
    }
    return `¡Hola! Soy ${local.persona_name || 'Asistente'} 🌴 ¡Bienvenido/a! Cuéntame, ¿en qué puedo ayudarte?`;
  };

  const save = async () => {
    onChange(local);
    await onSave(local);
  };

  const AVATAR_OPTIONS = ['🤖', '🌴', '⭐', '🏖️', '🌺', '🦜', '🏨', '💬', '✨', '🧑‍💼', '🌊', '🎉'];
  const [avatar, setAvatar] = useState('🌴');

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Persona"
        description="Define who your AI is. A named persona builds trust and sets tone."
      />

      {/* Name + avatar */}
      <div className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold">Identity</p>
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Avatar</p>
            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
              {AVATAR_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setAvatar(e)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all',
                    avatar === e ? 'border-primary bg-primary/5 scale-110' : 'border-border hover:border-primary/40'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Display name</label>
              <input
                className="mt-1 w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={local.persona_name}
                onChange={(e) => setLocal((l) => ({ ...l, persona_name: e.target.value }))}
                placeholder="Sofía, Carlos, Asistente…"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Guests will see this as the sender name.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Bio & personality <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={3}
            value={local.persona_bio}
            onChange={(e) => setLocal((l) => ({ ...l, persona_bio: e.target.value }))}
            placeholder="Soy la asistente virtual de Posada El Sol. Conozco cada detalle de las habitaciones, los precios y la zona. Me encanta ayudar a los huéspedes a planificar su estadía perfecta."
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            This backstory is injected into the AI system prompt — it shapes how confidently and warmly the AI responds.
          </p>
        </div>
      </div>

      {/* Greeting style */}
      <div className="rounded-xl border p-5 space-y-4">
        <p className="text-sm font-semibold">First-message greeting style</p>
        <OptionCards<WaGreetingStyle>
          value={local.greeting_style}
          onChange={(v) => setLocal((l) => ({ ...l, greeting_style: v }))}
          options={[
            {
              value: 'friendly',
              label: '😊 Friendly & warm',
              description: 'Casual, welcoming — great for leisure posadas.',
              example: `¡Hola! Soy ${local.persona_name || 'Asistente'} 🌴 ¡Bienvenido/a!`,
            },
            {
              value: 'professional',
              label: '🤝 Professional',
              description: 'Formal tone — better for boutique hotels or business guests.',
              example: `Good day! I'm ${local.persona_name || 'Asistente'}, your dedicated assistant.`,
            },
            {
              value: 'custom',
              label: '✏️ Custom',
              description: 'Write your own exact greeting.',
            },
          ]}
        />
        {local.greeting_style === 'custom' && (
          <textarea
            className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={2}
            value={local.custom_greeting}
            onChange={(e) => setLocal((l) => ({ ...l, custom_greeting: e.target.value }))}
            placeholder="Write the exact first message the AI will send…"
          />
        )}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-dashed p-4 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview — first message</p>
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-base shrink-0">{avatar}</div>
          <div className="bg-card border rounded-2xl rounded-bl-sm px-3 py-2 max-w-sm">
            <p className="text-sm">{previewGreeting()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} />
      </div>
    </div>
  );
}

function CommunicationTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const [local, setLocal] = useState({
    tone_formality:   cfg.tone_formality,
    tone_language:    cfg.tone_language,
    response_length:  cfg.response_length,
    booking_pressure: cfg.booking_pressure,
    emoji_style:      cfg.emoji_style,
  });

  const save = async () => {
    onChange(local);
    await onSave(local);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Communication Style"
        description="How the AI talks — formality, language, length, and pressure."
      />

      <div className="rounded-xl border p-5 space-y-6">
        {/* Formality */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Tone formality</p>
          <OptionCards<WaToneFormality>
            value={local.tone_formality}
            onChange={(v) => setLocal((l) => ({ ...l, tone_formality: v }))}
            options={[
              { value: 'casual',    label: '😎 Casual',      description: 'Conversational, relaxed. Uses colloquialisms, feels like a friend.', example: 'Hola! Claro que sí, tenemos cuarto disponible 👌' },
              { value: 'neutral',   label: '🙂 Neutral',     description: 'Balanced and approachable — works for most properties.',             example: 'Hola! Sí, tenemos disponibilidad para esas fechas.' },
              { value: 'formal',    label: '🎩 Formal',      description: 'Polished and professional. Uses full sentences, no shortcuts.',       example: 'Buenos días. Confirmamos disponibilidad para las fechas indicadas.' },
            ]}
          />
        </div>

        <Separator />

        {/* Language */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Language mode</p>
          <p className="text-xs text-muted-foreground">
            Bilingual auto-detects the guest&apos;s language and mirrors it.
          </p>
          <div className="flex gap-2">
            {([
              { value: 'es',       label: '🇻🇪 Spanish',   },
              { value: 'en',       label: '🇬🇧 English',   },
              { value: 'bilingual',label: '🌐 Bilingual',  },
            ] as { value: WaToneLanguage; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLocal((l) => ({ ...l, tone_language: opt.value }))}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all',
                  local.tone_language === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Response length */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Response length</p>
          <OptionCards<WaResponseLength>
            value={local.response_length}
            onChange={(v) => setLocal((l) => ({ ...l, response_length: v }))}
            options={[
              { value: 'brief',    label: '⚡ Brief',    description: '1–2 sentences max. Fast, WhatsApp-native.',                           example: 'Sí, disponible del 15 al 20. $120/noche.' },
              { value: 'standard', label: '📝 Standard', description: 'Full answer without padding. Most guests prefer this.',                 example: 'Hola! Sí, tenemos disponibilidad del 15 al 20 de enero. El precio es $120/noche con desayuno incluido.' },
              { value: 'detailed', label: '📖 Detailed', description: 'Thorough — includes extra context, tips, and alternatives. Best for luxury properties.', example: 'Hola! Sí tenemos disponibilidad del 15 al 20 de enero. La tarifa para esas fechas es $120 por noche, desayuno criollo incluido para 2 personas. También tenemos la Suite Deluxe a $160/noche si prefieren más espacio con terraza privada.' },
            ]}
          />
        </div>

        <Separator />

        {/* Booking pressure + emoji */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Booking pressure</p>
            <div className="space-y-2">
              {([
                { value: 'soft',   label: '🕊️ Soft',   description: "Suggests when guests seem ready — no pushy CTAs." },
                { value: 'direct', label: '🎯 Direct',  description: 'Actively asks for commitment after each quote.' },
              ] as { value: WaBookingPressure; label: string; description: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLocal((l) => ({ ...l, booking_pressure: opt.value }))}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-all',
                    local.booking_pressure === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  <p className={cn('text-xs font-medium', local.booking_pressure === opt.value ? 'text-primary' : '')}>{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Emoji usage</p>
            <div className="space-y-2">
              {([
                { value: 'frequent', label: '🎉 Lots of emojis', description: 'Every message gets emojis. Feels very warm.' },
                { value: 'moderate', label: '🙂 Occasional',     description: 'Emojis on greetings & confirmations only.' },
                { value: 'none',     label: '✍️ None',           description: 'Text only — cleaner for formal properties.' },
              ] as { value: WaEmojiStyle; label: string; description: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLocal((l) => ({ ...l, emoji_style: opt.value }))}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-all',
                    local.emoji_style === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  <p className={cn('text-xs font-medium', local.emoji_style === opt.value ? 'text-primary' : '')}>{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} />
      </div>
    </div>
  );
}

function RulesTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const [local, setLocal] = useState({
    upsell_enabled:         cfg.upsell_enabled,
    sentiment_threshold:    cfg.sentiment_threshold,
    value_escalation_usd:   cfg.value_escalation_usd,
    escalation_keywords:    cfg.escalation_keywords ?? [],
    response_delay_ms:      cfg.response_delay_ms,
  });

  const save = async () => {
    onChange(local);
    await onSave(local);
  };

  const sentimentLabel = (v: number) => {
    if (v <= 0.2) return 'Hair-trigger (escalates easily)';
    if (v <= 0.4) return 'Sensitive';
    if (v <= 0.6) return 'Balanced (recommended)';
    if (v <= 0.8) return 'Relaxed';
    return 'Very relaxed (rarely escalates)';
  };

  const delayLabel = (ms: number) => {
    if (ms === 0) return 'Instant';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s delay`;
  };

  const KEYWORD_SUGGESTIONS = [
    'precio', 'manager', 'hablar con alguien', 'queja', 'reembolso',
    'complaint', 'refund', 'speak to someone', 'supervisor', 'cancel',
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Smart Rules"
        description="Control when the AI escalates to you and how aggressively it sells."
      />

      {/* Upsell + response humanization */}
      <div className="rounded-xl border p-5 space-y-0">
        <SettingRow
          label="Upsell mode"
          hint="AI proactively suggests room upgrades, longer stays, and add-ons when relevant."
        >
          <Switch
            checked={local.upsell_enabled}
            onCheckedChange={(v) => setLocal((l) => ({ ...l, upsell_enabled: v }))}
          />
        </SettingRow>

        <SettingRow
          label="Humanisation delay"
          hint={`Adds a realistic pause before responding. ${delayLabel(local.response_delay_ms)}`}
          last
        >
          <div className="w-36">
            <Slider
              value={[local.response_delay_ms]}
              min={0} max={5000} step={500}
              onValueChange={(v) => setLocal((l) => ({ ...l, response_delay_ms: (Array.isArray(v) ? v[0] : v) ?? 0 }))}
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1">{delayLabel(local.response_delay_ms)}</p>
          </div>
        </SettingRow>
      </div>

      {/* Escalation */}
      <div className="rounded-xl border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-semibold">Escalation triggers</p>
        </div>
        <p className="text-xs text-muted-foreground">
          When any trigger fires, the conversation is flagged and you get an unread badge — no
          more missed upset guests.
        </p>

        {/* Sentiment slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Sentiment sensitivity</p>
            <Badge variant="secondary" className="text-[11px]">{sentimentLabel(local.sentiment_threshold)}</Badge>
          </div>
          <Slider
            value={[local.sentiment_threshold]}
            min={0} max={1} step={0.05}
            onValueChange={(v) => setLocal((l) => ({ ...l, sentiment_threshold: (Array.isArray(v) ? v[0] : v) ?? 0.3 }))}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Hair-trigger</span>
            <span>Balanced (0.3)</span>
            <span>Very relaxed</span>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
            Escalates when guest sentiment drops below this threshold. Lower = escalates more
            often. At 0.3 (recommended), an angry or confused message triggers a flag.
          </p>
        </div>

        <Separator />

        {/* Value threshold */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Booking value threshold</p>
          <p className="text-xs text-muted-foreground">Escalate to human when quoted booking exceeds this amount. Set to 0 to disable.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">$</span>
            <input
              type="number" min={0} step={50}
              className="w-32 rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={local.value_escalation_usd}
              onChange={(e) => setLocal((l) => ({ ...l, value_escalation_usd: parseInt(e.target.value) || 0 }))}
              placeholder="500"
            />
            <span className="text-sm text-muted-foreground">USD</span>
            {local.value_escalation_usd === 0 && (
              <Badge variant="outline" className="text-[11px] text-muted-foreground">disabled</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Keyword list */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Escalation keywords</p>
          <p className="text-xs text-muted-foreground">If a guest message contains any of these words, flag immediately.</p>
          <TagInput
            tags={local.escalation_keywords}
            onChange={(tags) => setLocal((l) => ({ ...l, escalation_keywords: tags }))}
            placeholder="Type a keyword and press Enter…"
          />
          {local.escalation_keywords.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              <p className="text-[11px] text-muted-foreground w-full">Suggestions:</p>
              {KEYWORD_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setLocal((l) => ({ ...l, escalation_keywords: [...l.escalation_keywords, s] }))}
                  className="text-[11px] px-2 py-1 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} />
      </div>
    </div>
  );
}

const DAY_LABELS: Record<keyof WaWorkingHours, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function AvailabilityTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const [local, setLocal] = useState({
    working_hours_enabled: cfg.working_hours_enabled,
    working_hours:         cfg.working_hours ?? DEFAULT_HOURS,
    after_hours_message:   cfg.after_hours_message ?? '',
  });

  const setDay = (day: keyof WaWorkingHours, patch: Partial<WaWorkingHours[keyof WaWorkingHours]>) =>
    setLocal((l) => ({
      ...l,
      working_hours: { ...l.working_hours, [day]: { ...l.working_hours[day], ...patch } } as WaWorkingHours,
    }));

  const save = async () => {
    onChange(local);
    await onSave(local);
  };

  const activeDays = (Object.entries(local.working_hours) as [keyof WaWorkingHours, WaWorkingHours[keyof WaWorkingHours]][])
    .filter(([, v]) => v.active).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Availability"
        description="Set hours when the AI is active. Outside these hours it sends your after-hours message."
      />

      <div className="rounded-xl border p-5 space-y-0">
        <SettingRow
          label="Working hours"
          hint={local.working_hours_enabled
            ? `Active ${activeDays}/7 days`
            : 'AI responds 24/7 when disabled.'}
          last={!local.working_hours_enabled}
        >
          <Switch
            checked={local.working_hours_enabled}
            onCheckedChange={(v) => setLocal((l) => ({ ...l, working_hours_enabled: v }))}
          />
        </SettingRow>

        {local.working_hours_enabled && (
          <>
            <div className="pt-4 space-y-2">
              {(Object.keys(local.working_hours) as (keyof WaWorkingHours)[]).map((day) => {
                const d = local.working_hours[day];
                return (
                  <div key={day} className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    d.active ? 'bg-primary/5' : 'opacity-50'
                  )}>
                    <Switch
                      checked={d.active}
                      onCheckedChange={(v) => setDay(day, { active: v })}
                    />
                    <span className="w-24 text-sm font-medium">{DAY_LABELS[day]}</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        className="rounded border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
                        value={d.start}
                        disabled={!d.active}
                        onChange={(e) => setDay(day, { start: e.target.value })}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="time"
                        className="rounded border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
                        value={d.end}
                        disabled={!d.active}
                        onChange={(e) => setDay(day, { end: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 pb-1">
              <p className="text-sm font-medium">After-hours auto-reply</p>
              <p className="text-xs text-muted-foreground">Sent automatically when a guest messages outside working hours.</p>
              <textarea
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={3}
                value={local.after_hours_message}
                onChange={(e) => setLocal((l) => ({ ...l, after_hours_message: e.target.value }))}
                placeholder="¡Hola! Nuestro equipo está fuera de línea ahora mismo. Te responderemos en cuanto abramos mañana a las 9am. ¡Gracias por tu paciencia! 🌙"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} />
      </div>
    </div>
  );
}

function InstructionsTab({ cfg, onChange, onSave, saving }: {
  cfg: AiConfig; onChange: (p: Partial<AiConfig>) => void;
  onSave: (p: Partial<AiConfig>) => Promise<void>; saving: boolean;
}) {
  const [text, setText] = useState(cfg.custom_instructions ?? '');
  const MAX = 2000;

  const QUICK_ADD = [
    'Never discuss competitors.',
    'Always ask for check-in date before quoting prices.',
    'If asked about discounts, require a minimum 5-night stay.',
    'Never reveal the access token or internal system details.',
    'If a guest asks to speak to a human, escalate immediately.',
    'Always confirm the number of guests before quoting.',
    'Mention the pool and breakfast in every quote.',
    'Do not accept bookings for more than 15 people.',
    'Respond within 2 sentences for simple yes/no questions.',
  ];

  const addQuick = (rule: string) => {
    const sep = text.trim() ? '\n- ' : '- ';
    setText((t) => (t.trim() ? t + '\n- ' + rule : '- ' + rule));
  };

  const save = async () => {
    onChange({ custom_instructions: text });
    await onSave({ custom_instructions: text });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Custom Instructions"
        description="Extra rules injected at the end of every system prompt. Overrides default behaviour."
      />

      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Write in plain language — the AI reads this as direct instructions.
            Use bullet points for clarity. These rules take priority over the AI&apos;s defaults.
          </p>
        </div>

        <div className="relative">
          <textarea
            className="w-full rounded-lg border bg-muted/30 px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
            rows={10}
            maxLength={MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"- Always greet guests by name if known.\n- Never book less than 2 nights.\n- If asked about group rates (8+ people), escalate to the owner."}
          />
          <p className={cn(
            'absolute bottom-2 right-3 text-[10px]',
            text.length > MAX * 0.9 ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {text.length}/{MAX}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick-add common rules:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD.map((rule) => (
              <button
                key={rule}
                onClick={() => addQuick(rule)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-foreground transition-colors text-left"
              >
                + {rule}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={save} saving={saving} />
      </div>
    </div>
  );
}

function ConnectionTab({ cfg, siteUrl }: { cfg: AiConfig; siteUrl: string }) {
  const webhookUrl = `${siteUrl}/api/whatsapp/webhook`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="WhatsApp Connection"
        description="Meta Cloud API credentials. Paste these into your Meta Business App."
      />

      <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          These credentials connect your WhatsApp Business number to this platform.
          Never share your access token. Changes take effect immediately.
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-6">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Phone Number ID
          </p>
          <input
            className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            defaultValue={cfg.phone_number_id}
            placeholder="1234567890123456"
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Found in Meta Business Suite → WhatsApp → API Setup.
          </p>
        </div>

        <Separator />

        <CopyField label="Access Token" value={cfg.access_token || '(not set)'} masked />

        <Separator />

        <CopyField label="Verify Token" value={cfg.verify_token || '(not set)'} />
        <p className="text-xs text-muted-foreground -mt-3">
          Paste this into Meta&apos;s webhook verification field. Do not change it.
        </p>

        <Separator />

        <CopyField label="Webhook URL — paste into Meta" value={webhookUrl} />
        <p className="text-xs text-muted-foreground -mt-3">
          Set this as your webhook callback URL in Meta Business Suite. Subscribe to <code className="bg-muted px-1 rounded">messages</code> events.
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-3">
        <p className="text-sm font-semibold">Setup checklist</p>
        {[
          'Create a Meta Business App at developers.facebook.com',
          'Add the WhatsApp product and configure a business phone number',
          'Copy the Phone Number ID and Access Token above',
          'Add the Webhook URL to your app with verify_token',
          'Subscribe to the "messages" webhook event',
          'Send a test message to confirm the connection',
        ].map((step, i) => (
          <div key={step} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AiSettingsPanel({
  initialConfig,
  onSave,
  isDemo = false,
  siteUrl = '',
}: AiSettingsPanelProps) {
  const [cfg, setCfg]     = useState<AiConfig>(initialConfig);
  const [tab, setTab]     = useState<Tab>('status');
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((patch: Partial<AiConfig>) => {
    setCfg((c) => ({ ...c, ...patch }));
  }, []);

  const handleSave = useCallback(async (patch: Partial<AiConfig>) => {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Saved (demo mode)');
      return;
    }
    setSaving(true);
    try {
      if (onSave) await onSave(patch);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save — try again');
    } finally {
      setSaving(false);
    }
  }, [isDemo, onSave]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'status',        label: 'Status',            icon: <Zap className="w-4 h-4" />,           badge: cfg.ai_enabled ? '●' : '○' },
    { id: 'persona',       label: 'Persona',           icon: <Bot className="w-4 h-4" />          },
    { id: 'communication', label: 'Communication',     icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'rules',         label: 'Smart Rules',       icon: <Shield className="w-4 h-4" />,        badge: cfg.escalation_keywords.length > 0 ? cfg.escalation_keywords.length : undefined },
    { id: 'availability',  label: 'Availability',      icon: <Clock className="w-4 h-4" />,         badge: cfg.working_hours_enabled ? 'on' : undefined },
    { id: 'instructions',  label: 'Instructions',      icon: <Wrench className="w-4 h-4" />,        badge: cfg.custom_instructions ? '✓' : undefined },
    { id: 'connection',    label: 'Connection',        icon: <Plug className="w-4 h-4" />          },
  ];

  const commonProps = { cfg, onChange: handleChange, onSave: handleSave, saving };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-52 shrink-0">
        <div className="sticky top-6 space-y-1">
          <div className="mb-4">
            <h1 className="text-xl font-bold">AI Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">WhatsApp concierge controls</p>
          </div>
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              active={tab === t.id}
              icon={t.icon}
              label={t.label}
              badge={t.badge}
              onClick={() => setTab(t.id)}
            />
          ))}

          {isDemo && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                <FlaskConical className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Demo mode</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                All changes are local — nothing is saved to a real database.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {tab === 'status'        && <StatusTab        {...commonProps} />}
        {tab === 'persona'       && <PersonaTab       {...commonProps} />}
        {tab === 'communication' && <CommunicationTab {...commonProps} />}
        {tab === 'rules'         && <RulesTab         {...commonProps} />}
        {tab === 'availability'  && <AvailabilityTab  {...commonProps} />}
        {tab === 'instructions'  && <InstructionsTab  {...commonProps} />}
        {tab === 'connection'    && <ConnectionTab cfg={cfg} siteUrl={siteUrl} />}
      </div>
    </div>
  );
}
