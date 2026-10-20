import type { ComponentType } from 'react';

/** Static metadata in src/topics/<slug>/meta.ts (`export const meta: TopicMeta`). */
export interface TopicMeta {
  title: string;
  /** One or two sentences shown on the home card. */
  summary: string;
  tags: string[];
  /** Sort key on the home page (ascending); defaults to 100. */
  order?: number;
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
