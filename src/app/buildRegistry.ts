import type { TheoryModule, TopicMeta, VizModule } from '../core/topic';

export interface TopicEntry {
  slug: string;
  meta: TopicMeta;
  loadViz: () => Promise<VizModule>;
  loadTheory: () => Promise<TheoryModule>;
}

type Loader<T> = () => Promise<T>;

/** "../topics/complex-structure/meta.ts" -> "complex-structure" */
export function slugFromPath(path: string): string | null {
  const m = /\/topics\/([^/]+)\/[^/]+$/.exec(path);
  return m ? m[1]! : null;
}

/**
 * Join the glob maps by folder name. A topic is listed when it has meta.ts,
 * Viz.tsx and Theory.tsx; folders starting with "_" (e.g. _template) are skipped.
 */
export function buildRegistry(
  metas: Record<string, { meta: TopicMeta }>,
  vizs: Record<string, Loader<VizModule>>,
  theories: Record<string, Loader<TheoryModule>>,
): TopicEntry[] {
  const bySlug = <T,>(rec: Record<string, T>) =>
    new Map(Object.entries(rec).flatMap(([p, v]) => {
      const s = slugFromPath(p);
      return s ? [[s, v] as const] : [];
    }));
  const vizMap = bySlug(vizs);
  const theoryMap = bySlug(theories);
  const out: TopicEntry[] = [];
  for (const [slug, mod] of bySlug(metas)) {
    if (slug.startsWith('_')) continue;
    const loadViz = vizMap.get(slug);
    const loadTheory = theoryMap.get(slug);
    if (!loadViz || !loadTheory) {
      console.warn(`[atlas] topic "${slug}" is missing Viz.tsx or Theory.tsx; skipped`);
      continue;
    }
    out.push({ slug, meta: mod.meta, loadViz, loadTheory });
  }
  return out.sort(
    (a, b) => (a.meta.order ?? 100) - (b.meta.order ?? 100) || a.meta.title.localeCompare(b.meta.title, 'tr'),
  );
}
