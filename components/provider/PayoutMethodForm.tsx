'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

type PayoutMethodType = 'zelle' | 'usdt' | 'binance' | 'bank';

interface PayoutMethodFormProps {
  providerId: string;
}

const METHODS: { value: PayoutMethodType; label: string; description: string }[] = [
  { value: 'zelle', label: 'Zelle', description: 'Instant USD transfers via Zelle' },
  { value: 'usdt', label: 'USDT TRC-20', description: 'Crypto payout via Tron network' },
  { value: 'binance', label: 'Binance P2P', description: 'Payout via Binance P2P trading' },
  { value: 'bank', label: 'Bank Transfer', description: 'ACH or wire transfer to bank account' },
];

export function PayoutMethodForm({ providerId }: PayoutMethodFormProps) {
  const [selected, setSelected] = useState<PayoutMethodType>('zelle');
  const [fields, setFields] = useState({
    zelle_email: '',
    zelle_phone: '',
    usdt_address: '',
    usdt_network: 'TRC-20',
    binance_username: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_routing_number: '',
    bank_name: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/provider-settings?provider_id=${providerId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setSelected(json.data.payout_method || 'zelle');
          setFields((prev) => ({ ...prev, ...json.data }));
        }
      })
      .catch(() => {});
  }, [providerId]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/provider-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, payout_method: selected, ...fields }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Payment method saved!');
    } catch {
      toast.error('Failed to save payment method');
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof fields, label: string, placeholder: string, type = 'text') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type={type}
          placeholder={placeholder}
          value={fields[key]}
          onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Payout Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Radio cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setSelected(m.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selected === m.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Method-specific fields */}
        <div className="space-y-3 pt-2">
          {selected === 'zelle' && (
            <>
              {field('zelle_email', 'Zelle Email', 'your@email.com', 'email')}
              {field('zelle_phone', 'Zelle Phone (optional)', '+1 555 000 0000', 'tel')}
            </>
          )}
          {selected === 'usdt' && (
            <>
              {field('usdt_address', 'Wallet Address (TRC-20)', 'TRx9v...')}
              <div className="space-y-1.5">
                <Label>Network</Label>
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">TRC-20 (Tron)</p>
              </div>
            </>
          )}
          {selected === 'binance' && (
            field('binance_username', 'Binance Username / Pay ID', 'yourusername')
          )}
          {selected === 'bank' && (
            <>
              {field('bank_account_name', 'Account Holder Name', 'John Doe')}
              {field('bank_name', 'Bank Name', 'Chase, Wells Fargo, etc.')}
              {field('bank_account_number', 'Account Number', '•••• •••• ••••')}
              {field('bank_routing_number', 'Routing Number', '021000021')}
            </>
          )}
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving…' : 'Save Payout Method'}
        </Button>
      </CardContent>
    </Card>
  );
}
