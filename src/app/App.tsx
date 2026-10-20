import { useEffect } from 'react';
import { useTheme } from '../core/ui/theme';
import { Home } from './Home';
import { TopicPage } from './TopicPage';
import { useHashRoute } from './useHashRoute';

const THEME_LABEL = { system: 'Tema: sistem', light: 'Tema: açık', dark: 'Tema: koyu' } as const;

export function App() {
  const route = useHashRoute();
  const { choice, cycle } = useTheme();
  const topicMatch = /^\/topic\/([^/?#]+)/.exec(route);

  const slug = topicMatch?.[1];
  useEffect(() => window.scrollTo(0, 0), [slug]);

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
          <button className="icon-btn" onClick={cycle} title="Temayı değiştir">
            {THEME_LABEL[choice]}
          </button>
        </div>
      </header>
      <main className="container">{slug ? <TopicPage slug={slug} /> : <Home />}</main>
      <footer>
        <div className="container">
          MIT lisanslı · Statik site, sunucu yok · Kaynak kodu GitHub’da
        </div>
      </footer>
    </>
  );
}
