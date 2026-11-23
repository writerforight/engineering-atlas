import { useEffect, useRef, type ReactNode } from 'react';
import { useHashParam } from './useHashParam';

export interface Chapter {
  id: string;
  /** Short title for the rail and the chapter heading. */
  title: string;
  /** One sentence under the heading: what this chapter shows. */
  lead?: ReactNode;
  render: () => ReactNode;
}

/**
 * Standard layout for a multi-step explainer: a numbered rail, one chapter
 * at a time, prev/next at the bottom. The open chapter is mirrored into the
 * hash (`?ch=<id>`), so every chapter can be linked directly.
 */
export function Chapters({ items, param = 'ch' }: { items: readonly Chapter[]; param?: string }) {
  const ids = items.map((c) => c.id);
  const [id, setId] = useHashParam(param, ids[0]!, ids);
  const idx = Math.max(0, ids.indexOf(id));
  const cur = items[idx]!;
  const topRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [idx]);

  const go = (i: number) => setId(ids[Math.min(ids.length - 1, Math.max(0, i))]!);

  return (
    <div className="chapters" ref={topRef} style={{ scrollMarginTop: 72 }}>
      <nav className="ch-rail" aria-label="Bölümler">
        <div className="ch-progress" style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
        {items.map((c, i) => (
          <button
            key={c.id}
            className="ch-pill"
            aria-current={i === idx ? 'step' : undefined}
            data-done={i < idx || undefined}
            onClick={() => go(i)}
          >
            <span className="ch-num">{i + 1}</span>
            <span className="ch-title">{c.title}</span>
          </button>
        ))}
      </nav>
      <section className="ch-body" aria-live="polite">
        <p className="ch-kicker">
          Bölüm {idx + 1} / {items.length}
        </p>
        <h3 className="ch-heading">{cur.title}</h3>
        {cur.lead && <p className="ch-lead">{cur.lead}</p>}
        <div className="ch-content">{cur.render()}</div>
      </section>
      <div className="ch-nav">
        <button className="btn" disabled={idx === 0} onClick={() => go(idx - 1)}>
          ← {idx > 0 ? items[idx - 1]!.title : 'Önceki'}
        </button>
        <button className="btn ch-next" disabled={idx === items.length - 1} onClick={() => go(idx + 1)}>
          {idx < items.length - 1 ? items[idx + 1]!.title : 'Sonraki'} →
        </button>
      </div>
    </div>
  );
}

/** The one sentence to remember from a chapter. */
export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="takeaway" role="note">
      <span className="takeaway-label">Akılda kalsın</span>
      {children}
    </div>
  );
}
