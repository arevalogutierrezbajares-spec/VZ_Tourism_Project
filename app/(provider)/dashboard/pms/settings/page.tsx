'use client';

import { useEffect, useState, useCallback } from 'react';
import { pmsApi, PmsApiError } from '@/lib/pms/api';
import { usePms } from '@/lib/pms/context';
import type { PmsProperty, TenantRole } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'fiscal' | 'team';

const VE_STATES = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
  'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia',
];

const ROLE_LABELS: Record<TenantRole, { label: string; color: string }> = {
  owner: { label: 'Propietario', color: 'bg-blue-100 text-blue-700' },
  front_desk: { label: 'Recepción', color: 'bg-green-100 text-green-700' },
  housekeeper: { label: 'Limpieza', color: 'bg-orange-100 text-orange-700' },
};

export default function PmsSettingsPage() {
  const { refresh } = usePms();
  const [tab, setTab] = useState<SettingsTab>('general');
  const [property, setProperty] = useState<PmsProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [igtfEnabled, setIgtfEnabled] = useState(false);

  // Team
  const [team, setTeam] = useState<{ id: string; name: string; email: string; role: TenantRole }[]>([]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prop = await pmsApi.get<PmsProperty>('properties/current');
      setProperty(prop);
      setName(prop.name);
      setAddress(prop.address || '');
      setCity(prop.city || '');
      setState(prop.state || '');
      setPhone(prop.phone || '');
      setEmail(prop.email || '');
      setIgtfEnabled(prop.igtf_enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await pmsApi.patch('properties/current', {
        name,
        address,
        city,
        state,
        phone: phone || null,
        email: email || null,
        igtf_enabled: igtfEnabled,
      });
      setSaveMsg('Guardado');
      refresh();
      setTimeout(() => setSaveMsg(null), 3000);
      // Fire-and-forget: sync PMS data to WhatsApp AI knowledge base
      fetch('/api/whatsapp/knowledge/sync-pms', { method: 'POST' }).catch(() => {});
    } catch (err) {
      setSaveMsg(err instanceof PmsApiError ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={loadSettings}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configuración</h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {([
          { key: 'general' as SettingsTab, label: 'General' },
          { key: 'fiscal' as SettingsTab, label: 'Fiscal / IGTF' },
          { key: 'team' as SettingsTab, label: 'Equipo' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Nombre de la posada
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Dirección
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Ciudad
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {VE_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Teléfono
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                Guardar
              </Button>
              {saveMsg && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  {saveMsg}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'fiscal' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">IGTF (Impuesto a Grandes Transacciones Financieras)</p>
                <p className="text-sm text-muted-foreground">
                  3% adicional en pagos con divisas (USD, USDT)
                </p>
              </div>
              <Switch
                checked={igtfEnabled}
                onCheckedChange={setIgtfEnabled}
              />
            </div>

            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Métodos de pago y aplicabilidad IGTF:
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Zelle (USD)</span>
                  <Badge variant="outline" className="text-xs">Aplica IGTF</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo USD</span>
                  <Badge variant="outline" className="text-xs">Aplica IGTF</Badge>
                </div>
                <div className="flex justify-between">
                  <span>USDT</span>
                  <Badge variant="outline" className="text-xs">Aplica IGTF</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Pago Móvil (VES)</span>
                  <Badge variant="secondary" className="text-xs">Exento</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Transferencia Bs (VES)</span>
                  <Badge variant="secondary" className="text-xs">Exento</Badge>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'team' && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">
              Gestión de equipo y permisos.
            </p>

            {team.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                <Users className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Solo el propietario tiene acceso actualmente.
                </p>
                <Button variant="outline" size="sm" disabled>
                  Invitar miembro (próximamente)
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {team.map((m) => {
                  const roleConfig = ROLE_LABELS[m.role];
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleConfig.color)}>
                        {roleConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
