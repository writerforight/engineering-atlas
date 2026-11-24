import { useMemo, useState } from 'react';
import { topics } from './registry';
import { topicHref } from './useHashRoute';
import { UI, localMeta, useLang } from '../core/i18n';

export function Home() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const { lang } = useLang();
  const local = useMemo(() => topics.map((t) => ({ slug: t.slug, ...localMeta(t.meta, lang) })), [lang]);
  const allTags = useMemo(() => [...new Set(local.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, lang)), [local, lang]);
  const activeTag = tag && allTags.includes(tag) ? tag : null;
  const q = query.trim().toLocaleLowerCase(lang);
  const shown = local.filter(
    (t) =>
      (!activeTag || t.tags.includes(activeTag)) &&
      (!q || `${t.title} ${t.summary} ${t.tags.join(' ')}`.toLocaleLowerCase(lang).includes(q)),
  );

  return (
    <>
      <section className="hero">
        <h1>{UI.heroTitle[lang]}</h1>
        <p>{UI.heroText[lang]}</p>
      </section>
      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder={UI.search[lang]}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={UI.searchLabel[lang]}
        />
        <div className="row">
          {allTags.map((t) => (
            <button key={t} className="chip" aria-pressed={activeTag === t} onClick={() => setTag(activeTag === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="cards">
        {shown.map((t) => (
          <a key={t.slug} className="card" href={topicHref(t.slug)}>
            <h2>{t.title}</h2>
            <p>{t.summary}</p>
            <div className="tags">
              {t.tags.map((x) => (
                <span key={x} className="tag">
                  {x}
                </span>
              ))}
            </div>
          </a>
        ))}
        {shown.length === 0 && <p style={{ color: 'var(--muted)' }}>{UI.noMatch[lang]}</p>}
      </div>
      <section className="roadmap">
        <h2 style={{ fontSize: '1rem', color: 'var(--fg)' }}>{UI.soon[lang]}</h2>
        <ul>
          {UI.roadmap[lang].map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
