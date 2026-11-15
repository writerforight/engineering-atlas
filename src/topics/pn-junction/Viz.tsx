import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../core/ui';

// The simulation is a standalone page in public/pn-junction/ (classic
// scripts, works from file:// and headless in Node); the site embeds it.
const SRC = `${import.meta.env.BASE_URL}pn-junction/index.html`;

export default function Viz() {
  const { resolved } = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1800);
  // Theme at first load goes in the URL; later changes go by message, so the
  // running simulation is not restarted.
  const [initialTheme] = useState(resolved);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'atlas-theme', theme: resolved }, window.location.origin);
  }, [resolved]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const data = e.data as { type?: string; h?: number };
      if (data?.type === 'pn-height' && typeof data.h === 'number') setHeight(Math.ceil(data.h));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div>
      <iframe
        ref={frame}
        src={`${SRC}?embed=1&theme=${initialTheme}`}
        title="p-n eklemi parçacık simülasyonu"
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Simülasyon ayrı bir sayfa olarak da açılır (sunucu ve derleme gerekmez):{' '}
        <a href={SRC} target="_blank" rel="noopener">
          pn-junction/index.html
        </a>
        . Fizik çekirdeği <code>sim.js</code> tarayıcıdan bağımsızdır; Node ile denetim:{' '}
        <code>node src/topics/pn-junction/check.mjs</code>.
      </p>
    </div>
  );
}
