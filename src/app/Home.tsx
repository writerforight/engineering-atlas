import { useMemo, useState } from 'react';
import { topics } from './registry';
import { topicHref } from './useHashRoute';

const ROADMAP = [
  'Kalman filtresi',
  'Fourier / spektrum',
  'Park / Clarke dönüşümü',
  'Matris üstel ve durum uzayı',
  'NVH spektral analiz',
];

export function Home() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const allTags = useMemo(() => [...new Set(topics.flatMap((t) => t.meta.tags))].sort((a, b) => a.localeCompare(b, 'tr')), []);
  const q = query.trim().toLocaleLowerCase('tr');
  const shown = topics.filter(
    (t) =>
      (!tag || t.meta.tags.includes(tag)) &&
      (!q || `${t.meta.title} ${t.meta.summary} ${t.meta.tags.join(' ')}`.toLocaleLowerCase('tr').includes(q)),
  );

  return (
    <>
      <section className="hero">
        <h1>Mühendislik matematiğini elinle oyna</h1>
        <p>
          Her konu aynı sırayı izler: kısa sezgi, etkileşimli görsel, ilk prensiplerden adım adım türetme ve
          yorum. Bir konu seç.
        </p>
      </section>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder="Konu ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Konu ara"
        />
        <div className="row">
          {allTags.map((t) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="cards">
        {shown.map((t) => (
          <a key={t.slug} className="card" href={topicHref(t.slug)}>
            <h2>{t.meta.title}</h2>
            <p>{t.meta.summary}</p>
            <div className="tags">
              {t.meta.tags.map((x) => (
                <span key={x} className="tag">
                  {x}
                </span>
              ))}
            </div>
          </a>
        ))}
        {shown.length === 0 && <p style={{ color: 'var(--muted)' }}>Eşleşen konu yok.</p>}
      </div>
      <section className="roadmap">
        <h2 style={{ fontSize: '1rem', color: 'var(--fg)' }}>Yakında</h2>
        <ul>
          {ROADMAP.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
