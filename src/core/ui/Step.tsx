import type { ReactNode } from 'react';

/** Container for a numbered derivation. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }}>{children}</ol>;
}

/**
 * One derivation step: a title, the math, and a mandatory "why" line saying
 * where the formula comes from (definition, previous step, known identity...).
 */
export function Step({ title, why, children }: { title: ReactNode; why: ReactNode; children?: ReactNode }) {
  return (
    <li className="step">
      <h3>{title}</h3>
      {children}
      <p className="why">
        <b>Nereden?</b> {why}
      </p>
    </li>
  );
}
