'use client';

import { useReducer, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, Loader2, Check, PartyPopper,
  MessageCircle, Plug, Bot, Brain, Clock, FlaskConical, Rocket,
  Smartphone, Copy, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, Sparkles,
} from 'lucide-react';
import {
  OptionCards, CopyField, ToggleChip, RoomBuilder, FaqBuilder,
  Field, SharedTextarea as Textarea, SharedInput as Input,
  AMENITY_OPTIONS, PAYMENT_OPTIONS, DEFAULT_HOURS,
} from '@/components/whatsapp/shared';
import type {
  WaGreetingStyle, WaToneFormality, WaToneLanguage,
  WaResponseLength, WaBookingPressure, WaEmojiStyle,
  WaWorkingHours, RoomType, PosadaPolicies, FaqPair,
} from '@/types/database';
import toast from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8;
const WIZARD_STORAGE_KEY = 'wa_setup_wizard_state';

const STEP_META = [
  { icon: MessageCircle, label: 'Welcome',          short: 'Inicio' },
  { icon: Smartphone,    label: 'Meta Business',     short: 'Meta' },
  { icon: Plug,          label: 'Webhook',           short: 'Webhook' },
  { icon: Bot,           label: 'Persona',           short: 'Persona' },
  { icon: Brain,         label: 'Knowledge',         short: 'Conocimiento' },
  { icon: Clock,         label: 'Working Hours',     short: 'Horario' },
  { icon: FlaskConical,  label: 'Test',              short: 'Probar' },
  { icon: Rocket,        label: 'Go Live',           short: 'Activar' },
];

// ─── Wizard state ───────────────────────────────────────────────────────────

interface WizardState {
  step: number;
  // Step 2: Meta
  phone_number_id: string;
  access_token: string;
  // Step 3: Webhook
  verify_token: string;
  webhook_url: string;
  // Step 4: Persona
  persona_name: string;
  persona_bio: string;
  greeting_style: WaGreetingStyle;
  custom_greeting: string;
  tone_formality: WaToneFormality;
  tone_language: WaToneLanguage;
  response_length: WaResponseLength;
  booking_pressure: WaBookingPressure;
  emoji_style: WaEmojiStyle;
  // Step 5: Knowledge
  property_description: string;
  location_details: string;
  room_types: RoomType[];
  amenities: string[];
  policies: PosadaPolicies;
  faqs: FaqPair[];
  payment_methods: string[];
  pms_imported: boolean;
  // Step 6: Working Hours
  working_hours_enabled: boolean;
  working_hours: WaWorkingHours;
  after_hours_message: string;
  // Step 7: Test
  test_message: string;
  test_response: string | null;
  test_loading: boolean;
  // Step 8: Go Live
  ai_enabled: boolean;
  saving: boolean;
  error: string | null;
  completed: boolean;
}

type Action =
  | { type: 'SET'; payload: Partial<WizardState> }
  | { type: 'NEXT' }
  | { type: 'BACK' };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload };
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS), error: null };
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1), error: null };
    default:
      return state;
  }
}

const initialState: WizardState = {
  step: 1,
  phone_number_id: '',
  access_token: '',
  verify_token: '',
  webhook_url: '',
  persona_name: 'Sofía',
  persona_bio: '',
  greeting_style: 'friendly',
  custom_greeting: '',
  tone_formality: 'casual',
  tone_language: 'es',
  response_length: 'standard',
  booking_pressure: 'soft',
  emoji_style: 'moderate',
  property_description: '',
  location_details: '',
  room_types: [],
  amenities: [],
  policies: {},
  faqs: [],
  payment_methods: [],
  pms_imported: false,
  working_hours_enabled: true,
  working_hours: DEFAULT_HOURS as WaWorkingHours,
  after_hours_message: '¡Hola! En este momento estamos fuera de horario. Te responderemos mañana a primera hora. 🌙',
  test_message: 'Hola, quiero saber los precios de las habitaciones para el fin de semana',
  test_response: null,
  test_loading: false,
  ai_enabled: true,
  saving: false,
  error: null,
  completed: false,
};

// ─── Collapsible guide ──────────────────────────────────────────────────────

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

// ─── Working hours grid ─────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};

function WorkingHoursGrid({
  hours, onChange,
}: { hours: WaWorkingHours; onChange: (h: WaWorkingHours) => void }) {
  const days = Object.entries(hours) as [keyof WaWorkingHours, { active: boolean; start: string; end: string }][];

  return (
    <div className="space-y-2">
      {days.map(([day, cfg]) => (
        <div key={day} className="flex items-center gap-3">
          <button
            onClick={() => onChange({ ...hours, [day]: { ...cfg, active: !cfg.active } })}
            className={cn(
              'w-20 text-left text-xs font-medium py-2 px-2 rounded-md transition-colors',
              cfg.active ? 'text-foreground bg-primary/10' : 'text-muted-foreground line-through'
            )}
          >
            {DAY_LABELS[day] ?? day}
          </button>
          {cfg.active ? (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                value={cfg.start}
                onChange={(e) => onChange({ ...hours, [day]: { ...cfg, start: e.target.value } })}
                className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="time"
                value={cfg.end}
                onChange={(e) => onChange({ ...hours, [day]: { ...cfg, end: e.target.value } })}
                className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Cerrado</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step components ────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">WhatsApp AI Agent</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Tu agente de IA responde automáticamente a los mensajes de WhatsApp, contesta preguntas sobre tu posada, gestiona consultas de reservas y escala conversaciones cuando es necesario.
        </p>
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-semibold mb-3">Lo que necesitas para empezar:</p>
          <ul className="space-y-2">
            {[
              'Una cuenta de Meta Business (business.facebook.com)',
              'Una app de WhatsApp Business configurada en Meta Developer',
              'Un número de teléfono dedicado para WhatsApp Business',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-semibold mb-3">Lo que configuras aquí:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Plug, label: 'Conexión Meta' },
              { icon: Bot, label: 'Personalidad del agente' },
              { icon: Brain, label: 'Base de conocimiento' },
              { icon: Clock, label: 'Horario de atención' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full" size="lg">
        Empezar configuración
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function StepMetaBusiness({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Conexión con Meta Business</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Necesitas obtener tus credenciales desde el panel de Meta Developer.
        </p>
      </div>

      <GuideSection title="Guía paso a paso">
        <ol className="list-decimal list-inside space-y-2">
          <li>Abre <strong>developers.facebook.com</strong> e inicia sesión</li>
          <li>Ve a tu app de WhatsApp Business (o crea una nueva)</li>
          <li>En el menú lateral, selecciona <strong>WhatsApp &gt; API Setup</strong></li>
          <li>Copia el <strong>Phone number ID</strong> (bajo &ldquo;From&rdquo; phone number)</li>
          <li>Genera un <strong>Permanent Access Token</strong> (o usa el temporal para pruebas)</li>
          <li>Pega ambos valores abajo</li>
        </ol>
      </GuideSection>

      <div className="space-y-4">
        <Field label="Phone Number ID" hint="El identificador numérico de tu número de WhatsApp Business">
          <Input
            value={state.phone_number_id}
            onChange={(v) => dispatch({ type: 'SET', payload: { phone_number_id: v } })}
            placeholder="123456789012345"
          />
        </Field>

        <Field label="Access Token" hint="Token permanente o temporal desde Meta Developer">
          <Textarea
            value={state.access_token}
            onChange={(v) => dispatch({ type: 'SET', payload: { access_token: v } })}
            placeholder="EAAGx..."
            rows={2}
          />
        </Field>
      </div>
    </div>
  );
}

function StepWebhook({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  useEffect(() => {
    if (!state.verify_token) {
      dispatch({ type: 'SET', payload: { verify_token: crypto.randomUUID() } });
    }
    if (!state.webhook_url) {
      dispatch({ type: 'SET', payload: { webhook_url: `${window.location.origin}/api/whatsapp/webhook` } });
    }
  }, [state.verify_token, state.webhook_url, dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración del Webhook</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Copia estos valores y configúralos en Meta Developer para que WhatsApp envíe mensajes a tu agente.
        </p>
      </div>

      <div className="space-y-4">
        <CopyField value={state.webhook_url} label="Webhook URL" />
        <CopyField value={state.verify_token} label="Verify Token" />
      </div>

      <GuideSection title="Cómo configurar en Meta Developer">
        <ol className="list-decimal list-inside space-y-2">
          <li>En tu app de WhatsApp, ve a <strong>Configuration</strong></li>
          <li>Haz clic en <strong>Edit</strong> en la sección Webhook</li>
          <li>Pega el <strong>Webhook URL</strong> de arriba en &ldquo;Callback URL&rdquo;</li>
          <li>Pega el <strong>Verify Token</strong> en &ldquo;Verify token&rdquo;</li>
          <li>Haz clic en <strong>Verify and save</strong></li>
          <li>Suscríbete al campo <strong>messages</strong> en Webhook fields</li>
        </ol>
      </GuideSection>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Nota:</strong> La verificación funcionará una vez que tu aplicación esté desplegada en producción.
          En desarrollo local, puedes usar herramientas como ngrok para exponer tu servidor.
        </p>
      </div>
    </div>
  );
}

function StepPersona({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  const set = (payload: Partial<WizardState>) => dispatch({ type: 'SET', payload });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Personalidad del agente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define cómo se presenta y comunica tu agente de IA con los huéspedes.
        </p>
      </div>

      <Field label="Nombre del agente" hint="El nombre que usará al saludar a los huéspedes">
        <Input value={state.persona_name} onChange={(v) => set({ persona_name: v })} placeholder="Sofía" />
      </Field>

      <Field label="Bio / descripción corta" hint="Opcional — una línea sobre el agente">
        <Input value={state.persona_bio} onChange={(v) => set({ persona_bio: v })} placeholder="Soy la asistente virtual de Posada Mochima" />
      </Field>

      <Field label="Estilo de saludo">
        <OptionCards
          value={state.greeting_style}
          onChange={(v) => set({ greeting_style: v })}
          options={[
            { value: 'friendly', label: 'Amigable', description: 'Cercano y cálido, como un anfitrión local', example: '¡Hola! 👋 Soy Sofía, la asistente virtual de Posada Mochima. ¿En qué te puedo ayudar?' },
            { value: 'professional', label: 'Profesional', description: 'Cortés y formal, enfocado en el servicio', example: 'Buenos días. Soy Sofía, asistente de Posada Mochima. ¿Cómo puedo asistirle?' },
            { value: 'custom', label: 'Personalizado', description: 'Define tu propio saludo' },
          ]}
        />
        {state.greeting_style === 'custom' && (
          <Textarea
            value={state.custom_greeting}
            onChange={(v) => set({ custom_greeting: v })}
            placeholder="Escribe el saludo exacto que enviará el agente..."
            rows={2}
          />
        )}
      </Field>

      <Field label="Idioma">
        <OptionCards
          value={state.tone_language}
          onChange={(v) => set({ tone_language: v })}
          options={[
            { value: 'es', label: 'Español', description: 'Siempre responde en español' },
            { value: 'en', label: 'English', description: 'Always responds in English' },
            { value: 'bilingual', label: 'Bilingüe', description: 'Detecta y responde en el idioma del huésped' },
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Extensión de respuestas">
          <OptionCards
            value={state.response_length}
            onChange={(v) => set({ response_length: v })}
            options={[
              { value: 'brief', label: 'Breve', description: '1-3 frases' },
              { value: 'standard', label: 'Estándar', description: '3-5 frases' },
              { value: 'detailed', label: 'Detallado', description: 'Respuestas completas' },
            ]}
          />
        </Field>

        <Field label="Estilo de emojis">
          <OptionCards
            value={state.emoji_style}
            onChange={(v) => set({ emoji_style: v })}
            options={[
              { value: 'frequent', label: 'Frecuente', description: 'Muchos emojis' },
              { value: 'moderate', label: 'Moderado', description: 'Algunos emojis' },
              { value: 'none', label: 'Ninguno', description: 'Sin emojis' },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

function StepKnowledge({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  const set = (payload: Partial<WizardState>) => dispatch({ type: 'SET', payload });
  const [syncing, setSyncing] = useState(false);

  const syncFromPms = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/knowledge/sync-pms', { method: 'POST' });
      if (res.ok) {
        const { data, synced_fields } = await res.json();
        set({
          property_description: data.property_description ?? state.property_description,
          location_details: data.location_details ?? state.location_details,
          room_types: data.room_types?.length ? data.room_types : state.room_types,
          amenities: data.amenities?.length ? data.amenities : state.amenities,
          pms_imported: true,
        });
        toast.success(`Sincronizado: ${synced_fields.join(', ')}`);
      } else {
        toast.error('No se pudo conectar con el PMS');
      }
    } catch {
      toast.error('Error al sincronizar con PMS');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Base de conocimiento</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enséñale a tu agente sobre tu propiedad. Mientras más información, mejores respuestas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={syncFromPms} disabled={syncing} className="gap-1.5 shrink-0">
          <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          {syncing ? 'Sincronizando…' : 'Importar desde PMS'}
        </Button>
      </div>

      {state.pms_imported && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-3">
          <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Datos importados desde tu PMS. Puedes editarlos abajo.
          </p>
        </div>
      )}

      <Field label="Descripción de la propiedad" hint="¿Qué hace especial a tu posada?">
        <Textarea
          value={state.property_description}
          onChange={(v) => set({ property_description: v })}
          placeholder="Somos una posada familiar en Mochima con vista al mar, ambiente relajado y contacto directo con la naturaleza..."
          rows={4}
        />
      </Field>

      <Field label="Ubicación y cómo llegar" hint="Dirección, referencias, transporte">
        <Textarea
          value={state.location_details}
          onChange={(v) => set({ location_details: v })}
          placeholder="Mochima, Sucre. A 10 minutos en lancha de la playa principal..."
          rows={3}
        />
      </Field>

      <Field label="Habitaciones y tarifas">
        <RoomBuilder
          rooms={state.room_types}
          onChange={(room_types) => set({ room_types })}
        />
      </Field>

      <Field label="Amenidades">
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <ToggleChip
              key={a}
              label={a}
              selected={state.amenities.includes(a)}
              onClick={() => set({
                amenities: state.amenities.includes(a)
                  ? state.amenities.filter((x) => x !== a)
                  : [...state.amenities, a],
              })}
            />
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Check-in">
          <Input
            value={state.policies.check_in ?? ''}
            onChange={(v) => set({ policies: { ...state.policies, check_in: v } })}
            placeholder="3:00 PM"
          />
        </Field>
        <Field label="Check-out">
          <Input
            value={state.policies.check_out ?? ''}
            onChange={(v) => set({ policies: { ...state.policies, check_out: v } })}
            placeholder="11:00 AM"
          />
        </Field>
      </div>

      <Field label="Política de cancelación">
        <Textarea
          value={state.policies.cancellation ?? ''}
          onChange={(v) => set({ policies: { ...state.policies, cancellation: v } })}
          placeholder="Cancelación gratuita hasta 7 días antes..."
          rows={2}
        />
      </Field>

      <Field label="Métodos de pago aceptados">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_OPTIONS.map((p) => (
            <ToggleChip
              key={p}
              label={p}
              selected={state.payment_methods.includes(p)}
              onClick={() => set({
                payment_methods: state.payment_methods.includes(p)
                  ? state.payment_methods.filter((x) => x !== p)
                  : [...state.payment_methods, p],
              })}
            />
          ))}
        </div>
      </Field>

      <Field label="Preguntas frecuentes" hint="Pares de pregunta/respuesta que el agente usará para responder">
        <FaqBuilder
          faqs={state.faqs}
          onChange={(faqs) => set({ faqs })}
        />
      </Field>
    </div>
  );
}

function StepWorkingHours({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  const set = (payload: Partial<WizardState>) => dispatch({ type: 'SET', payload });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Horario de atención</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define cuándo tu agente responde automáticamente. Fuera de horario, envía un mensaje predeterminado.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Activar horario</p>
          <p className="text-xs text-muted-foreground">Si está desactivado, el agente responde 24/7</p>
        </div>
        <Switch
          checked={state.working_hours_enabled}
          onCheckedChange={(v) => set({ working_hours_enabled: v })}
        />
      </div>

      {state.working_hours_enabled && (
        <>
          <WorkingHoursGrid
            hours={state.working_hours}
            onChange={(working_hours) => set({ working_hours })}
          />

          <Field label="Mensaje fuera de horario" hint="Se envía cuando un huésped escribe fuera del horario">
            <Textarea
              value={state.after_hours_message}
              onChange={(v) => set({ after_hours_message: v })}
              placeholder="¡Hola! En este momento estamos fuera de horario..."
              rows={3}
            />
          </Field>
        </>
      )}
    </div>
  );
}

function StepTest({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<Action> }) {
  const set = (payload: Partial<WizardState>) => dispatch({ type: 'SET', payload });

  const runTest = async () => {
    set({ test_loading: true, test_response: null });
    try {
      const res = await fetch('/api/whatsapp/test-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: state.test_message,
          config: {
            persona_name: state.persona_name,
            persona_bio: state.persona_bio,
            greeting_style: state.greeting_style,
            custom_greeting: state.greeting_style === 'custom' ? state.custom_greeting : null,
            tone_formality: state.tone_formality,
            tone_language: state.tone_language,
            response_length: state.response_length,
            booking_pressure: state.booking_pressure,
            emoji_style: state.emoji_style,
          },
          knowledge: {
            property_description: state.property_description,
            location_details: state.location_details,
            room_types: state.room_types,
            amenities: state.amenities,
            policies: state.policies,
          },
          provider_name: state.persona_name,
        }),
      });

      if (res.ok) {
        const { reply } = await res.json();
        set({ test_response: reply, test_loading: false });
      } else {
        set({ test_response: null, test_loading: false });
        toast.error('No se pudo generar una respuesta de prueba');
      }
    } catch {
      set({ test_response: null, test_loading: false });
      toast.error('Error al conectar con la IA');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Probar tu agente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envía un mensaje de prueba y verifica que tu agente responda como esperas.
        </p>
      </div>

      {/* Simulated chat */}
      <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
        {/* Guest message */}
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">Huésped</p>
            <Textarea
              value={state.test_message}
              onChange={(v) => set({ test_message: v })}
              placeholder="Escribe un mensaje de prueba..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={runTest} disabled={state.test_loading || !state.test_message.trim()} size="sm" className="gap-1.5">
            {state.test_loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {state.test_loading ? 'Generando…' : 'Probar respuesta'}
          </Button>
        </div>

        {/* AI response */}
        {state.test_response && (
          <div className="flex gap-2 flex-row-reverse">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] text-muted-foreground mb-1">{state.persona_name} (AI)</p>
              <div className="inline-block text-left bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-br-sm max-w-[90%]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{state.test_response}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          La respuesta se genera con la configuración actual del wizard. Puedes ajustar la personalidad o la base de conocimiento volviendo a los pasos anteriores.
        </p>
      </div>
    </div>
  );
}

function StepGoLive({ state, dispatch, onSave }: {
  state: WizardState;
  dispatch: React.Dispatch<Action>;
  onSave: () => Promise<void>;
}) {
  if (state.completed) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">¡Tu agente está activo!</h2>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            {state.persona_name} ya está respondiendo mensajes de WhatsApp. Puedes monitorear las conversaciones y ajustar la configuración en cualquier momento.
          </p>
        </div>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Button asChild size="lg">
            <Link href="/dashboard/whatsapp">
              <MessageCircle className="w-4 h-4 mr-2" />
              Ir a Conversaciones
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/whatsapp/brain">
              <Brain className="w-4 h-4 mr-2" />
              Editar base de conocimiento
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const summaryItems = [
    { label: 'Agente', value: state.persona_name, ok: !!state.persona_name },
    { label: 'Idioma', value: { es: 'Español', en: 'English', bilingual: 'Bilingüe' }[state.tone_language], ok: true },
    { label: 'Phone Number ID', value: state.phone_number_id ? '✓ Configurado' : 'Sin configurar', ok: !!state.phone_number_id },
    { label: 'Access Token', value: state.access_token ? '✓ Configurado' : 'Sin configurar', ok: !!state.access_token },
    { label: 'Descripción', value: state.property_description ? '✓ Completada' : 'Vacía', ok: !!state.property_description },
    { label: 'Habitaciones', value: `${state.room_types.length} tipo(s)`, ok: state.room_types.length > 0 },
    { label: 'Horario', value: state.working_hours_enabled ? '✓ Configurado' : '24/7', ok: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Resumen y activación</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa la configuración antes de activar tu agente.
        </p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-2">
          {summaryItems.map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={cn('text-sm font-medium', ok ? 'text-foreground' : 'text-amber-600')}>
                {value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
        <div>
          <p className="text-sm font-semibold">Activar agente de IA</p>
          <p className="text-xs text-muted-foreground">Comenzará a responder mensajes automáticamente</p>
        </div>
        <Switch
          checked={state.ai_enabled}
          onCheckedChange={(v) => dispatch({ type: 'SET', payload: { ai_enabled: v } })}
        />
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3">
          <p className="text-xs text-red-700 dark:text-red-300">{state.error}</p>
        </div>
      )}

      <Button onClick={onSave} disabled={state.saving} className="w-full" size="lg">
        {state.saving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Rocket className="w-4 h-4 mr-2" />
        )}
        {state.saving ? 'Guardando configuración…' : 'Activar agente'}
      </Button>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

function persistingReducer(state: WizardState, action: Action): WizardState {
  const next = reducer(state, action);
  // Don't persist transient UI state or completed wizard
  if (!next.completed && typeof window !== 'undefined') {
    try {
      const { test_loading, test_response, saving, error, ...persist } = next;
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(persist));
    } catch { /* quota exceeded or private browsing */ }
  }
  if (next.completed && typeof window !== 'undefined') {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  }
  return next;
}

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(persistingReducer, initialState);
  const [showResume, setShowResume] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step && parsed.step > 1) {
          setShowResume(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const resumeWizard = () => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'SET', payload: parsed });
      }
    } catch { /* ignore */ }
    setShowResume(false);
  };

  const startFresh = () => {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    setShowResume(false);
  };

  // Check if already configured
  const [existingConfig, setExistingConfig] = useState(false);
  useEffect(() => {
    fetch('/api/whatsapp/config').then(async (res) => {
      if (res.ok) {
        const { data } = await res.json();
        if (data?.phone_number_id) setExistingConfig(true);
      }
    });
  }, []);

  const canProceed = useCallback(() => {
    switch (state.step) {
      case 2: return state.phone_number_id.trim().length > 0 && state.access_token.trim().length > 0;
      case 4: return state.persona_name.trim().length > 0;
      default: return true;
    }
  }, [state.step, state.phone_number_id, state.access_token, state.persona_name]);

  const handleSave = async () => {
    dispatch({ type: 'SET', payload: { saving: true, error: null } });
    try {
      // Save config
      const configRes = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: state.phone_number_id,
          access_token: state.access_token,
          verify_token: state.verify_token,
          persona_name: state.persona_name,
          persona_bio: state.persona_bio || null,
          greeting_style: state.greeting_style,
          custom_greeting: state.greeting_style === 'custom' ? state.custom_greeting : null,
          tone_formality: state.tone_formality,
          tone_language: state.tone_language,
          response_length: state.response_length,
          booking_pressure: state.booking_pressure,
          emoji_style: state.emoji_style,
          upsell_enabled: true,
          sentiment_threshold: 0.3,
          value_escalation_usd: 0,
          escalation_keywords: [],
          response_delay_ms: 0,
          working_hours_enabled: state.working_hours_enabled,
          working_hours: state.working_hours_enabled ? state.working_hours : null,
          after_hours_message: state.working_hours_enabled ? state.after_hours_message : null,
          custom_instructions: null,
          ai_enabled: state.ai_enabled,
        }),
      });

      if (!configRes.ok) throw new Error('Failed to save configuration');

      const configJson = await configRes.json() as { plaintext_fallback?: boolean };
      if (configJson.plaintext_fallback) {
        toast('Token stored in plaintext — configure Supabase Vault for production security.', { icon: '⚠️' });
      }

      // Save knowledge (only include fields the user actually filled in)
      const knowledgeBody: Record<string, unknown> = {};
      if (state.property_description) knowledgeBody.property_description = state.property_description;
      if (state.location_details) knowledgeBody.location_details = state.location_details;
      if (state.room_types.length > 0) knowledgeBody.room_types = state.room_types;
      if (state.amenities.length > 0) knowledgeBody.amenities = state.amenities;
      if (Object.keys(state.policies).length > 0) knowledgeBody.policies = state.policies;
      if (state.faqs.length > 0) knowledgeBody.faqs = state.faqs;
      if (state.payment_methods.length > 0) knowledgeBody.payment_methods = state.payment_methods;

      if (Object.keys(knowledgeBody).length > 0) {
        const knowledgeRes = await fetch('/api/whatsapp/knowledge', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(knowledgeBody),
        });

        if (!knowledgeRes.ok) {
          toast.error('Configuración guardada, pero hubo un error al guardar el conocimiento. Puedes editarlo desde la página de Brain.');
        }
      }

      dispatch({ type: 'SET', payload: { saving: false, completed: true } });
      toast.success('¡Agente activado!');
    } catch (err) {
      dispatch({ type: 'SET', payload: { saving: false, error: 'Error al guardar la configuración. Intenta de nuevo.' } });
    }
  };

  const progress = (state.step / TOTAL_STEPS) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Resume banner */}
      {showResume && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Tienes un progreso guardado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Puedes continuar donde lo dejaste o empezar de nuevo.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={resumeWizard}>Continuar</Button>
            <Button size="sm" variant="ghost" onClick={startFresh}>Empezar de nuevo</Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            {existingConfig ? 'Reconfigura tu agente de WhatsApp' : 'Configura tu agente de IA en minutos'}
          </p>
        </div>
        {state.step > 1 && state.step < 8 && (
          <Badge variant="secondary" className="text-xs">
            Paso {state.step} de {TOTAL_STEPS}
          </Badge>
        )}
      </div>

      {/* Progress */}
      {state.step > 1 && !state.completed && (
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between">
            {STEP_META.map((s, i) => {
              const stepNum = i + 1;
              const Icon = s.icon;
              const isDone = state.step > stepNum;
              const isCurrent = state.step === stepNum;
              return (
                <button
                  key={i}
                  onClick={() => stepNum < state.step && dispatch({ type: 'SET', payload: { step: stepNum } })}
                  disabled={stepNum > state.step}
                  className={cn(
                    'flex flex-col items-center gap-0.5 transition-colors',
                    isDone ? 'text-primary cursor-pointer' : isCurrent ? 'text-foreground' : 'text-muted-foreground/40'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-medium hidden sm:block">{s.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step content */}
      <Card className={state.step === 1 || state.completed ? 'border-0 shadow-none bg-transparent' : ''}>
        <CardContent className={state.step === 1 || state.completed ? 'p-0' : 'py-6'}>
          {state.step === 1 && <StepWelcome onNext={() => dispatch({ type: 'NEXT' })} />}
          {state.step === 2 && <StepMetaBusiness state={state} dispatch={dispatch} />}
          {state.step === 3 && <StepWebhook state={state} dispatch={dispatch} />}
          {state.step === 4 && <StepPersona state={state} dispatch={dispatch} />}
          {state.step === 5 && <StepKnowledge state={state} dispatch={dispatch} />}
          {state.step === 6 && <StepWorkingHours state={state} dispatch={dispatch} />}
          {state.step === 7 && <StepTest state={state} dispatch={dispatch} />}
          {state.step === 8 && <StepGoLive state={state} dispatch={dispatch} onSave={handleSave} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      {state.step > 1 && state.step <= TOTAL_STEPS && !state.completed && state.step !== 8 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => dispatch({ type: 'BACK' })} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </Button>
          <Button onClick={() => dispatch({ type: 'NEXT' })} disabled={!canProceed()} className="gap-1.5">
            {state.step === 7 ? 'Finalizar' : 'Siguiente'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Back button for step 8 (before completed) */}
      {state.step === 8 && !state.completed && (
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => dispatch({ type: 'BACK' })} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </Button>
        </div>
      )}
    </div>
  );
}
