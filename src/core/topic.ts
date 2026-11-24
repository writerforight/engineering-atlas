import type { ComponentType } from 'react';

/** Static metadata in src/topics/<slug>/meta.ts (`export const meta: TopicMeta`). */
export interface TopicMeta {
  title: string;
  /** One or two sentences shown on the home card. */
  summary: string;
  tags: string[];
  /** Sort key on the home page (ascending); defaults to 100. */
  order?: number;
  /**
   * 'chapters': the page shows only the interactive part (a <Chapters> explainer)
   * without the Intuition / Derivation / Notes sections.
   */
  layout?: 'sections' | 'chapters';
  /** Language of the page content itself (default 'tr'). */
  contentLang?: 'tr' | 'de';
  /** German title / summary / tags, shown when the site language is German. */
  de?: { title: string; summary: string; tags?: string[] };
}

/**
 * src/topics/<slug>/Theory.tsx exports the three prose sections of a topic
 * page. The page always renders: Intuition -> Viz -> Derivation -> Notes.
 */
export interface TheoryModule {
  Intuition: ComponentType;
  Derivation: ComponentType;
  Notes: ComponentType;
}

export interface VizModule {
  default: ComponentType;
}
