/**
 * Editorial content for category and destination landing pages.
 *
 * Data lives in content/categories/*.json and content/destinations/*.json —
 * edit those files to update copy without touching TypeScript.
 *
 * Kept static so pages are fully server-renderable with zero API latency.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuideArticle {
  title: string;
  teaser: string;
  tag: string;
  readTime: string;
  image: string;
}

export interface QuickStat {
  label: string;
  value: string;
}

export interface CategoryContent {
  heroImage: string;
  headline: string;
  tagline: string;
  intro: string[];
  highlights: string[];
  quickStats: QuickStat[];
  guides: GuideArticle[];
}

export interface ActivityTile {
  icon: string;
  name: string;
  desc: string;
}

export interface DestinationContent {
  heroImage: string;
  headline: string;
  tagline: string;
  intro: string[];
  quickFacts: QuickStat[];
  topActivities: ActivityTile[];
  guides: GuideArticle[];
}

// ─── Category data (one file per category) ───────────────────────────────────

import beaches from '@/content/categories/beaches.json';
import mountains from '@/content/categories/mountains.json';
import cities from '@/content/categories/cities.json';
import ecoTours from '@/content/categories/eco-tours.json';
import gastronomy from '@/content/categories/gastronomy.json';
import adventure from '@/content/categories/adventure.json';
import wellness from '@/content/categories/wellness.json';
import cultural from '@/content/categories/cultural.json';

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  beaches: beaches as CategoryContent,
  mountains: mountains as CategoryContent,
  cities: cities as CategoryContent,
  'eco-tours': ecoTours as CategoryContent,
  gastronomy: gastronomy as CategoryContent,
  adventure: adventure as CategoryContent,
  wellness: wellness as CategoryContent,
  cultural: cultural as CategoryContent,
};

// ─── Destination data (one file per destination) ─────────────────────────────

import losRoques from '@/content/destinations/los-roques.json';
import merida from '@/content/destinations/merida.json';
import margarita from '@/content/destinations/margarita.json';
import canaima from '@/content/destinations/canaima.json';
import choroni from '@/content/destinations/choroni.json';
import morrocoy from '@/content/destinations/morrocoy.json';
import caracas from '@/content/destinations/caracas.json';
import maracaibo from '@/content/destinations/maracaibo.json';

export const DESTINATION_CONTENT: Record<string, DestinationContent> = {
  'los-roques': losRoques as DestinationContent,
  merida: merida as DestinationContent,
  margarita: margarita as DestinationContent,
  canaima: canaima as DestinationContent,
  choroni: choroni as DestinationContent,
  morrocoy: morrocoy as DestinationContent,
  caracas: caracas as DestinationContent,
  maracaibo: maracaibo as DestinationContent,
};
