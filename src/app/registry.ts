import type { TheoryModule, TopicMeta, VizModule } from '../core/topic';
import { buildRegistry } from './buildRegistry';

// Adding a folder under src/topics/ is all it takes to register a topic.
export const topics = buildRegistry(
  import.meta.glob<{ meta: TopicMeta }>(['../topics/*/meta.ts', '!../topics/_*/**'], { eager: true }),
  import.meta.glob<VizModule>(['../topics/*/Viz.tsx', '!../topics/_*/**']),
  import.meta.glob<TheoryModule>(['../topics/*/Theory.tsx', '!../topics/_*/**']),
);

export function findTopic(slug: string) {
  return topics.find((t) => t.slug === slug);
}
