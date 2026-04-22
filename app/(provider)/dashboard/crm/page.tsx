'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ArrowLeft } from 'lucide-react';

export default function CRMPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <Link href="/dashboard/whatsapp">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground text-sm">Gestión de huéspedes y relaciones</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-lg">CRM — Próximamente</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Aquí podrás ver el historial completo de cada huésped, notas, reservas anteriores,
            preferencias y etiquetas. Toda la información que necesitas para ofrecer un servicio personalizado.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/whatsapp">
                Volver a Mensajes
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
