import { useCallback, useMemo, useState } from 'react';
import { baryEval, baryWeights, gaussLegendre, linspace, nodes } from '../../core/math';
import { Canvas, KeyIdentity, Slider, Takeaway, Tex, dot, drawGridAxes, makeViewport, plotFn, type DrawContext } from '../../core/ui';
import { Choice, CurveToggle, MERKE, clip, pow10, toggle } from './shared';

type Kind = 'equi' | 'cheb' | 'leg';
const FUNCS = [
  { id: 'runge', label: '1/(1+25x²)', f: (x: number) => 1 / (1 + 25 * x * x) },
  { id: 'exp', label: 'eˣ', f: Math.exp },
  { id: 'abs', label: '|x|', f: Math.abs },
  { id: 'tanh', label: 'tanh 5x', f: (x: number) => Math.tanh(5 * x) },
  { id: 'sin', label: 'sin 4x', f: (x: number) => Math.sin(4 * x) },
] as const;
type FId = (typeof FUNCS)[number]['id'];
const KINDS: ReadonlyArray<{ id: Kind; label: string; col: 'c1' | 'c2' | 'c4' }> = [
  { id: 'equi', label: 'äquidistant', col: 'c2' },
  { id: 'cheb', label: 'Tschebyscheff', col: 'c4' },
  { id: 'leg', label: 'Legendre (Eigenwerte von J)', col: 'c1' },
];
const GRID = linspace(-1, 1, 400);

export function Ch6Nodes() {
  const [fid, setFid] = useState<FId>('runge');
  const [n, setN] = useState(12);
  const [show, setShow] = useState<Set<Kind | 'f'>>(new Set(['f', 'equi', 'cheb', 'leg']));
  const f = FUNCS.find((t) => t.id === fid)!.f;

  const res = useMemo(() => {
    const out = {} as Record<Kind, { x: number[]; p: (t: number) => number; err: number }>;
    for (const k of ['equi', 'cheb', 'leg'] as Kind[]) {
      const x = k === 'leg' ? gaussLegendre(n).x : nodes(k, n);
      const fx = x.map(f), w = baryWeights(x);
      const p = (t: number) => baryEval(x, fx, w, t);
      out[k] = { x, p, err: Math.max(...GRID.map((t) => Math.abs(p(t) - f(t)))) };
    }
    return out;
  }, [f, n]);

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lo = Math.min(...GRID.map(f)), hi = Math.max(...GRID.map(f));
    const m = (hi - lo) * 0.35 + 0.05;
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y: [lo - m, hi + m] }, { l: 36, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      if (show.has('f')) plotFn(ctx, vp, f, pal.fg, 3);
      KINDS.forEach((k, row) => {
        if (!show.has(k.id)) return;
        const col = pal[k.col];
        plotFn(ctx, vp, res[k.id].p, col, 2, 600);
        const yb = vp.y.invert(vp.bottom - 7 - row * 10);
        res[k.id].x.forEach((xi) => dot(ctx, vp, [xi, yb], col, 3.5));
      });
    });
  }, [f, res, show]);

  return (
    <>
      <KeyIdentity label="Ab jetzt">
        <Tex block tex="\text{Stützstellen }x_i=\text{Eigenwerte von }J_N=\text{Nullstellen von }p_N" />
      </KeyIdentity>
      <div className="panel">
        <Canvas draw={draw} aspect={0.5} maxHeight={420} ariaLabel="Interpolation mit drei Stützstellenwahlen" />
        <p className="canvas-caption">Punktreihen unten: Lage der Stützstellen. Baryzentrische Interpolation.</p>
        <div className="viz-grid" style={{ marginTop: 8 }}>
          <div className="controls">
            <Choice value={fid} onChange={setFid} items={FUNCS.map((t) => ({ id: t.id, label: t.label }))} />
            <Slider label="Anzahl Stützstellen N" value={n} min={2} max={30} step={1} onChange={setN} format={(t) => String(t)} />
            <div className="row">
              <CurveToggle on={show.has('f')} onClick={() => setShow(toggle(show, 'f'))} color="var(--fg)">f</CurveToggle>
              {KINDS.map((k) => (
                <CurveToggle key={k.id} on={show.has(k.id)} onClick={() => setShow(toggle(show, k.id))} color={`var(--${k.col})`}>
                  {k.label}
                </CurveToggle>
              ))}
            </div>
          </div>
          <table className="num-table">
            <thead><tr><th style={{ textAlign: 'left' }}>Stützstellen</th><th>max |p − f|</th></tr></thead>
            <tbody>
              {KINDS.map((k) => (
                <tr key={k.id}>
                  <td style={{ textAlign: 'left', color: `var(--${k.col})` }}>{k.label}</td>
                  <td>{pow10(res[k.id].err, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Takeaway label={MERKE}>
        Legendre-Knoten häufen sich an den Rändern wie Tschebyscheff-Knoten: kein Runge-Effekt.
      </Takeaway>
    </>
  );
}
