import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

interface TravelGuide {
  id: string;
  title: string;
  excerpt: string | null;
  region: string | null;
  is_published: boolean;
  created_at: string;
  author: { full_name: string } | null;
}

export const metadata: Metadata = { title: 'Admin: CMS' };

export default async function AdminCMSPage() {
  const supabase = await createClient();
  const { data: guides } = await supabase
    .from('guides')
    .select('*, author:users(full_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-muted-foreground text-sm">Manage travel guides and editorial content</p>
        </div>
        <Button size="sm">+ New Guide</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Travel Guides ({guides?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {guides && guides.length > 0 ? (
            <div className="space-y-3">
              {(guides as TravelGuide[]).map((guide) => (
                <div key={guide.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{guide.title}</p>
                      <Badge variant={guide.is_published ? 'default' : 'secondary'} className="text-xs">
                        {guide.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    {guide.excerpt && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{guide.excerpt}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      by {guide.author?.full_name} · {formatDate(guide.created_at)}
                      {guide.region && ` · ${guide.region}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <Button size="sm" variant="outline" className="text-xs">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No guides yet. Create your first travel guide.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
