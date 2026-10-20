import { useEffect, useState } from 'react';

/** Hash routing ("#/topic/<slug>") keeps GitHub Pages happy without a 404 hack. */
export function useHashRoute(): string {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const topicHref = (slug: string) => `#/topic/${slug}`;
