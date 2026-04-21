'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pmsApi } from '@/lib/pms/api';
import type { Guest } from '@/lib/pms/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Search, Users } from 'lucide-react';

// Deterministic tag color from string hash
function tagColor(tag: string): string {
  const colors = [
    'bg-primary/10 text-primary',
    'bg-secondary/10 text-secondary',
    'bg-primary/15 text-primary',
    'bg-accent/10 text-accent',
    'bg-accent/15 text-accent',
    'bg-primary/20 text-primary',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function GuestsPage() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadGuests = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = query && query.length >= 2
        ? `guests/search?q=${encodeURIComponent(query)}`
        : 'guests';
      const res = await pmsApi.get<Guest[] | { data: Guest[] }>(endpoint);
      const data = Array.isArray(res) ? res : res.data;
      setGuests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading guests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (search) {
      searchTimerRef.current = setTimeout(() => loadGuests(search), 300);
    } else {
      loadGuests();
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search, loadGuests]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Huéspedes</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-sm rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadGuests()}>
            Reintentar
          </Button>
        </div>
      ) : guests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No se encontraron huéspedes.' : 'Aún no hay huéspedes registrados.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Estancias</TableHead>
                <TableHead>Etiquetas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow
                  key={g.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/pms/guests/${g.id}`)}
                >
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {g.phone || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {g.email || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {g.total_stays}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {g.tags?.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${tagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
