'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomType {
  id: string;
  listing_id: string;
  name: string;
  base_price: number;
  max_guests: number;
  amenities: string[];
  count: number;
}

interface RoomTypeManagerProps {
  listingId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Amenities preset list
// ---------------------------------------------------------------------------

const AMENITY_OPTIONS = [
  'WiFi',
  'A/C',
  'TV',
  'Hot water',
  'Private bathroom',
  'Balcony',
  'Ocean view',
  'Mountain view',
  'Mini fridge',
  'Safe',
  'Hair dryer',
  'Towels',
  'Pool access',
  'Breakfast included',
  'Parking',
];

// ---------------------------------------------------------------------------
// Room form
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: '',
  base_price: '',
  max_guests: '',
  count: '',
  amenities: [] as string[],
};

function RoomForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<RoomType>;
  onSave: (data: Omit<RoomType, 'id' | 'listing_id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    base_price: String(initial?.base_price ?? ''),
    max_guests: String(initial?.max_guests ?? ''),
    count: String(initial?.count ?? '1'),
    amenities: initial?.amenities ?? [],
  });

  const [amenityInput, setAmenityInput] = useState('');

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const addCustomAmenity = () => {
    const trimmed = amenityInput.trim();
    if (!trimmed || form.amenities.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, amenities: [...prev.amenities, trimmed] }));
    setAmenityInput('');
  };

  const isValid =
    form.name.trim() &&
    Number(form.base_price) > 0 &&
    Number(form.max_guests) > 0 &&
    Number(form.count) > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      base_price: Number(form.base_price),
      max_guests: Number(form.max_guests),
      count: Number(form.count),
      amenities: form.amenities,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-muted/30">
      {/* Name */}
      <div className="space-y-1">
        <label htmlFor="room-name" className="text-sm font-medium">Room name</label>
        <input
          id="room-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Habitacion Doble, Suite, Familiar"
          className="w-full rounded-md border px-3 py-2 text-sm bg-background"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Base price */}
        <div className="space-y-1">
          <label htmlFor="room-price" className="text-sm font-medium">Base price (USD/night)</label>
          <input
            id="room-price"
            type="number"
            min={1}
            value={form.base_price}
            onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </div>
        {/* Max guests */}
        <div className="space-y-1">
          <label htmlFor="room-max-guests" className="text-sm font-medium">Max guests</label>
          <input
            id="room-max-guests"
            type="number"
            min={1}
            value={form.max_guests}
            onChange={(e) => setForm((p) => ({ ...p, max_guests: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </div>
        {/* Count */}
        <div className="space-y-1">
          <label htmlFor="room-count" className="text-sm font-medium">Number of rooms</label>
          <input
            id="room-count"
            type="number"
            min={1}
            value={form.count}
            onChange={(e) => setForm((p) => ({ ...p, count: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amenities</label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={cn(
                'text-xs rounded-full px-2.5 py-1 border transition-colors',
                form.amenities.includes(a)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              )}
            >
              {a}
            </button>
          ))}
        </div>
        {/* Custom amenity */}
        <div className="flex gap-2">
          <input
            type="text"
            value={amenityInput}
            onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomAmenity()}
            placeholder="Add custom amenity…"
            className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustomAmenity}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" disabled={!isValid} onClick={handleSubmit}>
          <Check className="w-3 h-3 mr-1" /> Save Room Type
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RoomTypeManager({ listingId, className }: RoomTypeManagerProps) {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/room-types`);
      const d = await res.json();
      setRooms(d.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [listingId]);

  const handleAdd = async (data: Omit<RoomType, 'id' | 'listing_id'>) => {
    await fetch(`/api/listings/${listingId}/room-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setAdding(false);
    await fetchRooms();
  };

  const handleEdit = async (id: string, data: Omit<RoomType, 'id' | 'listing_id'>) => {
    await fetch(`/api/listings/${listingId}/room-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditingId(null);
    await fetchRooms();
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/listings/${listingId}/room-types/${id}`, {
        method: 'DELETE',
      });
      toast.success('Room type deleted');
      await fetchRooms();
    } catch {
      toast.error('Failed to delete room type');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Room Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage room types for your posada
          </p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Room Type
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {rooms.length === 0 && !adding && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No room types yet. Add your first one to get started.
              </CardContent>
            </Card>
          )}

          {rooms.map((room) =>
            editingId === room.id ? (
              <RoomForm
                key={room.id}
                initial={room}
                onSave={(data) => handleEdit(room.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {room.count} room{room.count !== 1 ? 's' : ''} · max {room.max_guests} guest
                        {room.max_guests !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">${room.base_price}/night</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => setEditingId(room.id)}
                        aria-label={`Edit ${room.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive"
                              aria-label={`Delete ${room.name}`}
                            />
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &ldquo;{room.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this room type. Existing bookings will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(room.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                {room.amenities.length > 0 && (
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          )}

          {adding && (
            <RoomForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          )}
        </>
      )}
    </div>
  );
}
