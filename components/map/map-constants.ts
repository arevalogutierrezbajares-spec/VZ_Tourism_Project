import { CATEGORY_COLORS } from '@/lib/mapbox/helpers';

export const SOURCE_ID = 'listings-source';
export const CLUSTER_LAYER = 'clusters';
export const CLUSTER_COUNT_LAYER = 'cluster-count';
export const POINT_LAYER = 'unclustered-point';
export const GLOW_LAYER = 'pin-glow';

export const DEFAULT_COLOR = '#6B7280';

/** Mapbox match expression: category string → hex color */
export const CATEGORY_COLOR_EXPR: unknown[] = (() => {
  const expr: unknown[] = ['match', ['get', 'category']];
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    expr.push(key, color);
  }
  // Raw aliases that may appear in GeoJSON before normalization
  expr.push('restaurants', CATEGORY_COLORS.gastronomy);
  expr.push('culture', CATEGORY_COLORS.cultural);
  expr.push('cities', CATEGORY_COLORS.accommodation);
  expr.push(DEFAULT_COLOR); // fallback
  return expr;
})();
