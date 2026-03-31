import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { AdminSafetyZoneForm } from '@/components/admin/AdminSafetyZoneForm';
import type { SafetyZone } from '@/types/database';

export const metadata: Metadata = { title: 'Admin: Safety Zones' };

export default async function AdminSafetyZonesPage() {
  const supabase = await createClient();
  const { data: zones } = await supabase
    .from('safety_zones')
    .select('*')
    .order('level');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Safety Zones</h1>
        <p className="text-muted-foreground text-sm">Manage travel safety advisories</p>
      </div>

      <AdminSafetyZoneForm />

      <Card>
        <CardHeader><CardTitle className="text-base">Current Safety Zones</CardTitle></CardHeader>
        <CardContent>
          {zones && zones.length > 0 ? (
            <div className="space-y-4">
              {(zones as SafetyZone[]).map((zone) => (
                <div key={zone.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <SafetyBadge level={zone.level} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{zone.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{zone.description}</p>
                    {zone.tips.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {zone.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No safety zones defined</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
