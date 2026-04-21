import type { Metadata } from 'next';
import { Shield, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { createClient } from '@/lib/supabase/server';
import { SAFETY_LEVELS, VENEZUELA_REGIONS } from '@/lib/constants';
import type { SafetyZone } from '@/types/database';

export const metadata: Metadata = {
  title: 'Safety Hub',
  description: 'Safety information and travel advisories for Venezuela',
};

export default async function SafetyPage() {
  let safetyZones = null;
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('safety_zones')
        .select('*')
        .order('level');
      safetyZones = data;
    }
  } catch {
    // Supabase not configured
  }

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-balance">Safety Hub</h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-pretty">
          Stay informed about safety conditions across Venezuela to plan your journey confidently.
        </p>
      </div>

      {/* Safety levels legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Safety Level Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SAFETY_LEVELS.map((level) => (
              <div key={level.value} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <SafetyBadge level={level.value} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{level.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            General Safety Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground" role="list">
            {[
              'Always use app-based transportation (Uber, InDriver) instead of hailing taxis on the street',
              'Keep a low profile and avoid displaying expensive jewelry, cameras, or phones in public',
              'Carry a photocopy of your passport, not the original',
              'Stay in well-lit, populated areas especially at night',
              'Share your itinerary with someone trusted before traveling to remote areas',
              'Keep emergency contacts readily accessible',
              'Use ATMs inside banks or shopping centers during business hours',
              'Purchase travel insurance that includes medical evacuation',
              'Learn basic Spanish phrases for emergencies',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5 flex-shrink-0" aria-hidden="true">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Destination safety */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Safety by Destination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {VENEZUELA_REGIONS.map((region) => (
              <div key={region.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{region.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{region.description}</p>
                </div>
                <SafetyBadge level={region.safetyLevel} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-destructive" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'Emergency (General)', number: '911' },
              { name: 'Fire Department', number: '171' },
              { name: 'Police (CICPC)', number: '0800-CICPC00' },
              { name: 'Civil Protection', number: '0800-PROTEGE' },
              { name: 'Tourist Police (Caracas)', number: '+58-212-573-4600' },
              { name: 'Red Cross Venezuela', number: '+58-212-571-8461' },
            ].map((contact) => (
              <div key={contact.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm font-medium">{contact.name}</span>
                <a
                  href={`tel:${contact.number}`}
                  className="text-sm font-mono text-primary hover:underline"
                >
                  {contact.number}
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Safety zones from DB */}
      {safetyZones && safetyZones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Specific Zone Advisories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(safetyZones as SafetyZone[]).map((zone) => (
                <div key={zone.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <SafetyBadge level={zone.level} />
                    <h4 className="font-semibold text-sm">{zone.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                  {zone.tips.length > 0 && (
                    <ul className="space-y-1">
                      {zone.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary font-bold">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
