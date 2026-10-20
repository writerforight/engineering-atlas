import { describe, expect, it } from 'vitest';
import { buildRegistry, slugFromPath } from './buildRegistry';

const loader = () => Promise.resolve({} as never);
const meta = (title: string, order?: number) => ({ meta: { title, summary: '', tags: [], order } });

describe('topic registry', () => {
  it('extracts slugs from glob paths', () => {
    expect(slugFromPath('../topics/laplace-integration/meta.ts')).toBe('laplace-integration');
    expect(slugFromPath('nope')).toBeNull();
  });

  it('joins by folder, skips _template and incomplete topics, sorts by order', () => {
    const reg = buildRegistry(
      {
        '../topics/b/meta.ts': meta('B', 2),
        '../topics/a/meta.ts': meta('A', 1),
        '../topics/_template/meta.ts': meta('T'),
        '../topics/half/meta.ts': meta('Half'),
      },
      { '../topics/a/Viz.tsx': loader, '../topics/b/Viz.tsx': loader, '../topics/_template/Viz.tsx': loader },
      {
        '../topics/a/Theory.tsx': loader,
        '../topics/b/Theory.tsx': loader,
        '../topics/_template/Theory.tsx': loader,
        '../topics/half/Theory.tsx': loader,
      },
    );
    expect(reg.map((t) => t.slug)).toEqual(['a', 'b']);
  });

  it('real topics folder registers the shipped topics', async () => {
    const { topics } = await import('./registry');
    const slugs = topics.map((t) => t.slug);
    expect(slugs).toContain('complex-structure');
    expect(slugs).toContain('laplace-integration');
  });
});
