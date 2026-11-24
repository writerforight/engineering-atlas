import { useEffect } from 'react';
import { useTheme } from '../core/ui/theme';
import { LANGS, UI, useLang } from '../core/i18n';
import { Home } from './Home';
import { TopicPage } from './TopicPage';
import { useHashRoute } from './useHashRoute';

export function App() {
  const route = useHashRoute();
  const { choice, cycle } = useTheme();
  const { lang, setLang } = useLang();
  const topicMatch = /^\/topic\/([^/?#]+)/.exec(route);

  const slug = topicMatch?.[1];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <>
      <header className="site-header">
        <div className="container">
          <a className="brand" href="#/">
            <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="12" fill="none" stroke="var(--c1)" strokeWidth="3" />
              <circle cx="28" cy="16" r="3.5" fill="var(--c2)" />
            </svg>
            Engineering Atlas
          </a>
          <div className="header-actions">
            <div className="lang-switch" role="group" aria-label={UI.langTitle[lang]}>
              {LANGS.map((l) => (
                <button key={l} className="icon-btn" aria-pressed={l === lang} onClick={() => setLang(l)} lang={l}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={cycle} title={UI.themeTitle[lang]}>
              <span className="theme-prefix">{UI.themePrefix[lang]} </span>
              {UI.theme[lang][choice]}
            </button>
          </div>
        </div>
      </header>
      <main className="container">{slug ? <TopicPage slug={slug} /> : <Home />}</main>
      <footer>
        <div className="container">
          {UI.footer[lang]}
        </div>
      </footer>
    </>
  );
}
