export type DiscoverItem = {
  id: string;
  /** Where this content came from */
  source_type: 'unsplash' | 'instagram' | 'creator';
  /** Photo URL (for unsplash/creator) or thumbnail URL (for instagram) */
  url: string;
  /** Instagram oEmbed URL — populated when source_type is 'instagram' */
  instagram_embed_url?: string | null;
  /** Instagram post URL */
  instagram_post_url?: string | null;
  /** Raw Instagram oEmbed HTML for direct rendering */
  instagram_embed_html?: string | null;
  /** Creator handle (for instagram/creator) */
  creator_handle?: string | null;
  caption: string;
  description: string;
  region: string;
  region_name: string;
  category: string;
  tags: string[];
  aspect: number;
  featured: boolean;
  lat: number;
  lng: number;
  geo_label: string;
  /** Fine-grained location type for geo-tagging */
  location_category?: 'viewpoint' | 'beach_access' | 'trailhead' | 'waterfall' | 'market' | 'restaurant' | 'hotel' | 'wildlife_spot' | 'cultural_site' | 'activity_spot' | null;
};
