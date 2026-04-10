'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, Heart, Bookmark } from 'lucide-react';

interface AdminItinerary {
  id: string;
  title: string;
  is_public: boolean;
  is_influencer_pick: boolean;
  total_days: number;
  regions: string[];
  likes: number;
  saves: number;
  views: number;
  user: { full_name: string } | null;
  created_at: string;
}

export default function AdminItinerariesPage() {
  const [itineraries, setItineraries] = useState<AdminItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/itineraries?limit=100')
      .then((r) => r.json())
      .then(({ data }) => setItineraries(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleInfluencerPick = async (id: string, current: boolean) => {
    const res = await fetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_influencer_pick: !current }),
    });
    if (res.ok) {
      setItineraries((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, is_influencer_pick: !current } : it
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Itineraries</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Itineraries</h1>
        <p className="text-sm text-gray-500">
          Manage itineraries and influencer picks. {itineraries.length} total.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Itineraries ({itineraries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itineraries.length > 0 ? (
            <div className="space-y-2">
              {itineraries.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{it.title}</p>
                      {it.is_public && (
                        <Badge variant="default" className="text-[10px]">Public</Badge>
                      )}
                      {it.is_influencer_pick && (
                        <Badge className="text-[10px] bg-amber-500">Influencer Pick</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{it.user?.full_name || 'Unknown'}</span>
                      <span>{it.total_days}d</span>
                      <span>{it.regions.join(', ')}</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{it.views}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{it.likes}</span>
                      <span className="flex items-center gap-0.5"><Bookmark className="w-3 h-3" />{it.saves}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={it.is_influencer_pick ? 'default' : 'outline'}
                    className="flex-shrink-0 ml-4 text-xs gap-1"
                    onClick={() => toggleInfluencerPick(it.id, it.is_influencer_pick)}
                  >
                    <Star className={`w-3.5 h-3.5 ${it.is_influencer_pick ? 'fill-white' : ''}`} />
                    {it.is_influencer_pick ? 'Featured' : 'Feature'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No itineraries found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
