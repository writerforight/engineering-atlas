import type { ReactNode } from 'react';
import type { Viewport } from '../../core/ui';

/** A row of mutually exclusive buttons. */
export function Choice<T extends string | number>({
  value, onChange, items, label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: ReadonlyArray<{ id: T; label: ReactNode }>;
  label?: ReactNode;
}) {
  return (
    <div className="row" role="group">
      {label && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</span>}
      {items.map((it) => (
        <button key={String(it.id)} className="btn" aria-pressed={it.id === value} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle buttons for a set of visible series. */
export function Toggles<T extends string>({
  value, onChange, items,
}: {
  value: ReadonlySet<T>;
  onChange: (v: Set<T>) => void;
  items: ReadonlyArray<{ id: T; label: ReactNode; color?: string }>;
}) {
  return (
    <div className="row" role="group">
      {items.map((it) => (
        <button
          key={it.id}
          className="btn"
          aria-pressed={value.has(it.id)}
          onClick={() => {
            const s = new Set(value);
            if (s.has(it.id)) s.delete(it.id);
            else s.add(it.id);
            onChange(s);
          }}
        >
          {it.color && (
            <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: it.color, marginRight: 6 }} />
          )}
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Run `fn` with drawing clipped to the plot area. */
export function clip(ctx: CanvasRenderingContext2D, vp: Viewport, fn: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(vp.left, vp.top, vp.right - vp.left, vp.bottom - vp.top);
  ctx.clip();
  fn();
  ctx.restore();
}

export const SERIES = ['c1', 'c2', 'c3', 'c4'] as const;

/** y-range covering sampled values of several functions on [a, b], with margin. */
export function yRange(fns: ReadonlyArray<(x: number) => number>, a: number, b: number, pad = 0.1): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const f of fns)
    for (let i = 0; i <= 200; i++) {
      const v = f(a + ((b - a) * i) / 200);
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  if (!(hi > lo)) [lo, hi] = [lo - 1, hi + 1];
  const m = (hi - lo) * pad;
  return [lo - m, hi + m];
}

/** 4.4e-16 → "4.4·10⁻¹⁶" (0 → "0"). */
export function pow10(x: number, digits = 1): string {
  if (x === 0) return '0';
  if (!Number.isFinite(x)) return String(x);
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  const sup = String(e).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!);
  return `${m.toFixed(digits)}·10${sup}`;
}

/** Legend entry that switches a curve on and off. */
export function CurveToggle({
  on, onClick, color, dash, children,
}: { on: boolean; onClick: () => void; color: string; dash?: boolean; children: ReactNode }) {
  return (
    <button className="btn" aria-pressed={on} onClick={onClick} style={{ opacity: on ? 1 : 0.55 }}>
      <i className="swatch" data-dash={dash || undefined} style={{ color }} />
      {children}
    </button>
  );
}

/** Set-of-ids state helper for curve toggles. */
export function toggle<T>(s: ReadonlySet<T>, id: T): Set<T> {
  const n = new Set(s);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  return n;
}

export const MERKE = 'Merke';
