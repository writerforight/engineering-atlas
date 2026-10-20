import type { ReactNode } from 'react';

export function Callout({ kind = 'info', title, children }: { kind?: 'info' | 'warn'; title?: ReactNode; children: ReactNode }) {
  return (
    <div className={`callout ${kind}`} role={kind === 'warn' ? 'alert' : 'note'}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}
