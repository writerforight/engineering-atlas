import { useEffect, useState, type ComponentType } from 'react';
import type { TheoryModule } from '../core/topic';
import { findTopic } from './registry';

const SECTIONS = [
  { id: 'sezgi', title: 'Sezgi' },
  { id: 'etkilesim', title: 'Etkileşimli görsel' },
  { id: 'turetme', title: 'Adım adım türetme' },
  { id: 'yorum', title: 'Yorum ve genelleme' },
] as const;

interface Loaded {
  Viz: ComponentType;
  theory: TheoryModule;
}

export function TopicPage({ slug }: { slug: string }) {
  const topic = findTopic(slug);
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

  useEffect(() => {
    document.title = topic ? `${topic.meta.title} · Engineering Atlas` : 'Engineering Atlas';
    return () => {
      document.title = 'Engineering Atlas';
    };
  }, [topic]);

  if (!topic) {
    return (
      <p>
        Konu bulunamadı. <a href="#/">Ana sayfaya dön</a>
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
        ← Tüm konular
      </a>
      <header className="topic-head">
        <h1>{topic.meta.title}</h1>
        <p className="summary">{topic.meta.summary}</p>
        <div className="tags">
          {topic.meta.tags.map((x) => (
            <span key={x} className="tag">
              {x}
            </span>
          ))}
        </div>
        <nav className="toc" aria-label="Bölümler">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} onClick={jump(s.id)}>
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
      </header>
      {error && <p className="bad">Konu yüklenemedi: {error}</p>}
      {!mods && !error && <p style={{ color: 'var(--muted)' }}>Yükleniyor…</p>}
      {mods &&
        SECTIONS.map((s, i) => {
          const Part = parts[s.id];
          return (
            <section key={s.id} id={s.id} className="section" style={{ scrollMarginTop: 72 }}>
              <h2>
                <span className="num">0{i + 1}</span>
                {s.title}
              </h2>
              {Part && <Part />}
            </section>
          );
        })}
    </article>
  );
}
