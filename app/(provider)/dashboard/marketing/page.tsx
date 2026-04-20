import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Share2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Marketing' };

export default async function MarketingPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, slug, cover_image_url, tags, is_published')
    .eq('provider_id', provider?.id || '');

  const { data: igMentions } = await supabase
    .from('ig_mentions')
    .select('*')
    .in('listing_id', listings?.map((l) => l.id) || [])
    .order('posted_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing</h1>
        <p className="text-muted-foreground text-sm">Manage your social presence and visibility</p>
      </div>

      {/* Shareable links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Shareable Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings && listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {process.env.NEXT_PUBLIC_APP_URL || 'https://vztravel.app'}/listing/{listing.slug}
                    </p>
                  </div>
                  <Badge variant={listing.is_published ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                    {listing.is_published ? 'Live' : 'Draft'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-shrink-0"
                    onClick={() => {}}
                  >
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Create a listing to get shareable links</p>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Your Activity Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings && listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id}>
                  <p className="text-sm font-medium mb-1.5">{listing.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(listing.tags || []).length > 0 ? (
                      listing.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No listings yet</p>
          )}
        </CardContent>
      </Card>

      {/* Share2 mentions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share2 Mentions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {igMentions && igMentions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {igMentions.map((mention) => (
                <a
                  key={mention.id}
                  href={mention.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
                >
                  {mention.media_url && (
                    <img src={mention.media_url} alt={`Social mention by @${mention.username}`} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium">@{mention.username}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(mention.posted_at)}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Share2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">No Share2 mentions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Encourage guests to tag your experiences</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
