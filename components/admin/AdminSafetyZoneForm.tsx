'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  level: z.enum(['green', 'yellow', 'orange', 'red']),
  tips: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export function AdminSafetyZoneForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
  });

  async function onSubmit(data: Form) {
    setIsLoading(true);
    try {
      const tips = data.tips ? data.tips.split('\n').filter(Boolean) : [];
      const res = await fetch('/api/safety-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tips }),
      });
      if (!res.ok) throw new Error('Failed to create safety zone');
      toast.success('Safety zone created!');
      reset();
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast.error('Failed to create safety zone');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">+ Add Safety Zone</Button>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">New Safety Zone</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="e.g., Caracas Centro" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Safety Level *</Label>
              <Select onValueChange={(v) => setValue('level', v as Form['level'])}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green — Safe</SelectItem>
                  <SelectItem value="yellow">Yellow — Caution</SelectItem>
                  <SelectItem value="orange">Orange — High Risk</SelectItem>
                  <SelectItem value="red">Red — Extreme Risk</SelectItem>
                </SelectContent>
              </Select>
              {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea {...register('description')} rows={2} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Safety Tips (one per line)</Label>
            <Textarea {...register('tips')} rows={3} placeholder="Stay in groups at night&#10;Avoid remote areas" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? 'Creating...' : 'Create Zone'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
