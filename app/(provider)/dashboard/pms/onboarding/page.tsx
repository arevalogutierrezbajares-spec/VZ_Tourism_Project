'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { pmsApi, PmsApiError } from '@/lib/pms/api';
import { usePms } from '@/lib/pms/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Check, Plus, Trash2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

const VE_STATES = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
  'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia',
];

const TOTAL_STEPS = 4;

interface UnitTypeForm {
  name: string;
  base_rate: number;
  max_occupancy: number;
}

interface UnitForm {
  name: string;
  unit_type_id: string;
  floor: string;
}

export default function PmsOnboardingPage() {
  const router = useRouter();
  const { refresh } = usePms();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Property
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('');
  const [propState, setPropState] = useState('');
  const [propPhone, setPropPhone] = useState('');
  const [propEmail, setPropEmail] = useState('');

  // Step 2: Unit Types
  const [unitTypes, setUnitTypes] = useState<UnitTypeForm[]>([
    { name: 'Habitación Estándar', base_rate: 50, max_occupancy: 2 },
  ]);
  const [createdTypeIds, setCreatedTypeIds] = useState<Map<number, string>>(new Map());

  // Step 3: Units
  const [units, setUnits] = useState<UnitForm[]>([
    { name: 'Hab. 1', unit_type_id: '', floor: '1' },
  ]);

  // Step 4: Complete
  const [completed, setCompleted] = useState(false);

  async function handleNext() {
    setSaving(true);
    setError(null);
    try {
      if (step === 1) {
        // Create property
        const prop = await pmsApi.post<{ id: string; name: string }>('auth/property', {
          name: propName,
        });
        // Store property ID for subsequent calls
        localStorage.setItem('pms_property_id', prop.id);

        // Update property details
        await pmsApi.patch('properties/current', {
          address: propAddress,
          city: propCity,
          state: propState,
          phone: propPhone || null,
          email: propEmail || null,
        });

        setStep(2);
      } else if (step === 2) {
        // Create unit types
        const newIds = new Map<number, string>();
        for (let i = 0; i < unitTypes.length; i++) {
          const ut = unitTypes[i];
          if (!ut.name) continue;
          const result = await pmsApi.post<{ id: string }>('units/types', {
            name: ut.name,
            base_rate_cents: Math.round(ut.base_rate * 100),
            max_adults: ut.max_occupancy,
            max_children: 1,
            amenities: [],
          });
          newIds.set(i, result.id);
        }
        setCreatedTypeIds(newIds);

        // Auto-set first unit type for existing units
        const firstTypeId = newIds.get(0);
        if (firstTypeId) {
          setUnits((prev) =>
            prev.map((u) => (u.unit_type_id ? u : { ...u, unit_type_id: firstTypeId })),
          );
        }

        setStep(3);
      } else if (step === 3) {
        // Create units
        for (const u of units) {
          if (!u.name || !u.unit_type_id) continue;
          await pmsApi.post('units', {
            name: u.name,
            unit_type_id: u.unit_type_id,
            floor: u.floor || null,
            status: 'active',
          });
        }

        // Mark onboarding complete
        await pmsApi.patch('properties/current/onboarding', {
          onboarding_step: TOTAL_STEPS,
          onboarding_completed: true,
        });

        setCompleted(true);
        setStep(4);
        // Fire-and-forget: sync PMS data to WhatsApp AI knowledge base
        fetch('/api/whatsapp/knowledge/sync-pms', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof PmsApiError ? err.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  }

  function handleFinish() {
    refresh();
    router.replace('/dashboard/pms');
  }

  const progress = ((step - 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Configuración inicial</span>
          <span className="text-muted-foreground">Paso {step} de {TOTAL_STEPS}</span>
        </div>
        <Progress value={completed ? 100 : progress} />
      </div>

      {/* Step 1: Property */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h3 className="font-semibold">Datos de tu posada</h3>
              <p className="text-sm text-muted-foreground">
                Información básica de tu propiedad.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Nombre de la posada *
                </label>
                <input
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  placeholder="Posada El Paraíso"
                  required
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Dirección
                </label>
                <input
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Ciudad
                </label>
                <input
                  value={propCity}
                  onChange={(e) => setPropCity(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <select
                  value={propState}
                  onChange={(e) => setPropState(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {VE_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Teléfono
                </label>
                <input
                  value={propPhone}
                  onChange={(e) => setPropPhone(e.target.value)}
                  placeholder="+58..."
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={propEmail}
                  onChange={(e) => setPropEmail(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleNext}
              disabled={!propName || saving}
              className="w-full"
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Unit Types */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h3 className="font-semibold">Tipos de habitación</h3>
              <p className="text-sm text-muted-foreground">
                Define los tipos de habitación de tu posada y sus tarifas base.
              </p>
            </div>

            <div className="space-y-3">
              {unitTypes.map((ut, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_36px] items-end gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Nombre
                    </label>
                    <input
                      value={ut.name}
                      onChange={(e) => {
                        const next = [...unitTypes];
                        next[i] = { ...next[i], name: e.target.value };
                        setUnitTypes(next);
                      }}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      $/noche
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={ut.base_rate}
                      onChange={(e) => {
                        const next = [...unitTypes];
                        next[i] = { ...next[i], base_rate: Number(e.target.value) };
                        setUnitTypes(next);
                      }}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Max
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={ut.max_occupancy}
                      onChange={(e) => {
                        const next = [...unitTypes];
                        next[i] = { ...next[i], max_occupancy: Number(e.target.value) };
                        setUnitTypes(next);
                      }}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={unitTypes.length <= 1}
                    onClick={() =>
                      setUnitTypes(unitTypes.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setUnitTypes([
                    ...unitTypes,
                    { name: '', base_rate: 50, max_occupancy: 2 },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar tipo
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
              <Button
                onClick={handleNext}
                disabled={unitTypes.every((ut) => !ut.name) || saving}
                className="flex-1"
              >
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Units */}
      {step === 3 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h3 className="font-semibold">Habitaciones</h3>
              <p className="text-sm text-muted-foreground">
                Agrega las habitaciones individuales de tu posada.
              </p>
            </div>

            <div className="space-y-3">
              {units.map((u, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_60px_36px] items-end gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Nombre
                    </label>
                    <input
                      value={u.name}
                      onChange={(e) => {
                        const next = [...units];
                        next[i] = { ...next[i], name: e.target.value };
                        setUnits(next);
                      }}
                      placeholder="Hab. 1"
                      className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Tipo
                    </label>
                    <select
                      value={u.unit_type_id}
                      onChange={(e) => {
                        const next = [...units];
                        next[i] = { ...next[i], unit_type_id: e.target.value };
                        setUnits(next);
                      }}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {Array.from(createdTypeIds.entries()).map(([idx, typeId]) => (
                        <option key={typeId} value={typeId}>
                          {unitTypes[idx]?.name || `Tipo ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Piso
                    </label>
                    <input
                      value={u.floor}
                      onChange={(e) => {
                        const next = [...units];
                        next[i] = { ...next[i], floor: e.target.value };
                        setUnits(next);
                      }}
                      className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={units.length <= 1}
                    onClick={() => setUnits(units.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setUnits([
                    ...units,
                    {
                      name: `Hab. ${units.length + 1}`,
                      unit_type_id: createdTypeIds.get(0) || '',
                      floor: '1',
                    },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar habitación
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Atrás
              </Button>
              <Button
                onClick={handleNext}
                disabled={units.every((u) => !u.name || !u.unit_type_id) || saving}
                className="flex-1"
              >
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Finalizar configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <PartyPopper className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold">¡Listo!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Tu posada está configurada. Ya puedes empezar a recibir reservas
              y gestionar tu propiedad desde el PMS.
            </p>
            <Button onClick={handleFinish} className="mt-2">
              Ir al calendario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
