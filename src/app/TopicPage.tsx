import { useEffect, useState, type ComponentType } from 'react';
import type { TheoryModule } from '../core/topic';
import { hashParams } from '../core/ui/useHashParam';
import { findTopic } from './registry';
import { UI, localMeta, useLang } from '../core/i18n';

const SECTIONS = [{ id: 'sezgi' }, { id: 'etkilesim' }, { id: 'turetme' }, { id: 'yorum' }] as const;

interface Loaded {
  Viz: ComponentType;
  theory: TheoryModule;
}

export function TopicPage({ slug }: { slug: string }) {
  const topic = findTopic(slug);
  const { lang } = useLang();
  const m = topic ? localMeta(topic.meta, lang) : null;
  const [loaded, setLoaded] = useState<{ slug: string; mods: Loaded } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) return;
    let alive = true;
    setError(null);
    Promise.all([topic.loadViz(), topic.loadTheory()])
      .then(([viz, theory]) => alive && setLoaded({ slug, mods: { Viz: viz.default, theory } }))
      .catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [topic, slug]);

  // "?section=<id>" deep-links to a section once the topic has loaded.
  const ready = loaded?.slug === slug;
  useEffect(() => {
    if (!ready) return;
    const id = hashParams().get('section');
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [ready]);

  useEffect(() => {
    document.title = m ? `${m.title} · Engineering Atlas` : 'Engineering Atlas';
    return () => {
      document.title = 'Engineering Atlas';
    };
  }, [m?.title]);

  if (!topic || !m) {
    return (
      <p>
        {UI.notFound[lang]} <a href="#/">{UI.home[lang]}</a>
      </p>
    );
  }

  const mods = loaded?.slug === slug ? loaded.mods : null;
  const parts: Record<(typeof SECTIONS)[number]['id'], ComponentType | undefined> = {
    sezgi: mods?.theory.Intuition,
    etkilesim: mods?.Viz,
    turetme: mods?.theory.Derivation,
    yorum: mods?.theory.Notes,
  };

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <article>
      <a className="back" href="#/">
        {UI.back[lang]}
      </a>
      <header className="topic-head">
        <h1>{m.title}</h1>
        <p className="summary">{m.summary}</p>
        <div className="tags">
          {m.tags.map((x) => (
            <span key={x} className="tag">
              {x}
            </span>
          ))}
        </div>
        {topic.meta.layout !== 'chapters' && <nav className="toc" aria-label={UI.sectionsLabel[lang]}>
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} onClick={jump(s.id)}>
              {i + 1}. {UI.sections[lang][s.id]}
            </a>
          ))}
        </nav>}
        {lang !== (topic.meta.contentLang ?? 'tr') && UI.contentNote[lang] && <p className="content-note">{UI.contentNote[lang]}</p>}
      </header>
      {error && <p className="bad">{UI.loadError[lang]} {error}</p>}
      {!mods && !error && <p style={{ color: 'var(--muted)' }}>{UI.loading[lang]}</p>}
      {mods && topic.meta.layout === 'chapters' && (
        <div id="etkilesim" className="section" style={{ scrollMarginTop: 72 }}>
          <mods.Viz />
        </div>
      )}
      {mods &&
        topic.meta.layout !== 'chapters' &&
        SECTIONS.map((s, i) => {
          const Part = parts[s.id];
          return (
            <section key={s.id} id={s.id} className="section" style={{ scrollMarginTop: 72 }}>
              <h2>
                <span className="num">0{i + 1}</span>
                {UI.sections[lang][s.id]}
              </h2>
              {Part && <Part />}
            </section>
          );
        })}
    </article>
  );
}
