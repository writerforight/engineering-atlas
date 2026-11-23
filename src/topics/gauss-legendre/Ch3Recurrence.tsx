import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { evalPoly, gramSchmidt, inner, legendreB, texNum, type Poly } from '../../core/math';
import { Canvas, KeyIdentity, Slider, Takeaway, Tex, drawGridAxes, fmt, makeViewport, polyline, type DrawContext } from '../../core/ui';
import { CurveToggle, MERKE, clip, toggle, yRange } from './shared';

const K = 8;
const xTimes = (p: Poly): Poly => [0, ...p];
type Curve = 'lhs' | 'next' | 'prev' | 'sum';
const CURVES: ReadonlyArray<{ id: Curve; col: 'fg' | 'c1' | 'c2' | 'c3'; dash?: boolean }> = [
  { id: 'lhs', col: 'fg' },
  { id: 'next', col: 'c1' },
  { id: 'prev', col: 'c2' },
  { id: 'sum', col: 'c3', dash: true },
];

export function Ch3Recurrence() {
  const [n, setN] = useState(2);
  const [show, setShow] = useState<Set<Curve>>(new Set(['lhs', 'next', 'prev', 'sum']));
  const P = useMemo(() => gramSchmidt(K).map((s) => s.p), []);
  const pn = P[n]!, pm = P[n - 1]!, pp = P[n + 1]!;
  const nn = inner(pn, pn), mm = inner(pm, pm), xa = inner(xTimes(pn), pn);
  const b = nn / mm;

  const fns: Record<Curve, (x: number) => number> = useMemo(() => ({
    lhs: (x) => x * evalPoly(pn, x),
    next: (x) => evalPoly(pp, x),
    prev: (x) => b * evalPoly(pm, x),
    sum: (x) => evalPoly(pp, x) + b * evalPoly(pm, x),
  }), [pn, pp, pm, b]);

  const C = useMemo(
    () => Array.from({ length: K }, (_, k) => Array.from({ length: K }, (_, m) => inner(xTimes(P[m]!), P[k]!) / inner(P[k]!, P[k]!))),
    [P],
  );

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y: yRange(Object.values(fns), -1, 1) }, { l: 44, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      for (const c of CURVES) {
        if (!show.has(c.id)) continue;
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= 400; i++) {
          const x = -1.05 + (2.1 * i) / 400;
          pts.push([x, fns[c.id](x)]);
        }
        polyline(ctx, vp, pts, pal[c.col], c.id === 'lhs' ? 5 : 2.5, c.dash ? [8, 6] : []);
      }
    });
  }, [fns, show]);

  const names: Record<Curve, ReactNode> = {
    lhs: <>x·p<sub>{n}</sub></>,
    next: <>p<sub>{n + 1}</sub></>,
    prev: <>b<sub>{n}</sub>·p<sub>{n - 1}</sub></>,
    sum: <>p<sub>{n + 1}</sub> + b<sub>{n}</sub>·p<sub>{n - 1}</sub></>,
  };

  return (
    <>
      <KeyIdentity label="Drei-Term-Rekursion">
        <Tex block tex="x\,p_n = p_{n+1} + a_n\,p_n + b_n\,p_{n-1}" />
      </KeyIdentity>
      <div className="prose">
        <Tex block tex="\langle x p_n,p_k\rangle=\langle p_n,x p_k\rangle=0\quad\text{für }k\le n-2\qquad(\deg x p_k<n)" />
        <Tex block tex="a_n=\frac{\langle x p_n,p_n\rangle}{\langle p_n,p_n\rangle}=0,\qquad b_n=\frac{\langle p_n,p_n\rangle}{\langle p_{n-1},p_{n-1}\rangle}=\frac{n^2}{4n^2-1}" />
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.6} maxHeight={360} ariaLabel="Rekursion als Kurven" />
          <div className="row">
            {CURVES.map((c) => (
              <CurveToggle key={c.id} on={show.has(c.id)} onClick={() => setShow(toggle(show, c.id))} color={`var(--${c.col})`} dash={c.dash}>
                {names[c.id]}
              </CurveToggle>
            ))}
          </div>
          <p className="canvas-caption">Die gestrichelte Summe liegt genau auf der dicken Kurve x·p<sub>{n}</sub>.</p>
          <Slider label="n" value={n} min={1} max={K - 1} step={1} onChange={setN} format={(t) => String(t)} />
        </div>
        <div className="panel readout">
          <b>n = {n}</b>
          <div className="scroll-x">
            <Tex block tex={`a_{${n}}=\\frac{${texNum(xa)}}{${texNum(nn)}}=${texNum(xa / nn)},\\qquad b_{${n}}=\\frac{${texNum(nn)}}{${texNum(mm)}}=${texNum(b)}=\\frac{${n * n}}{${4 * n * n - 1}}`} />
          </div>
          <span>Abweichung von n²/(4n²−1): <span className="ok">{Math.abs(b - legendreB(n)).toExponential(0)}</span></span>
          <b style={{ marginTop: 8 }}>Koeffizient von pₖ in x·pₘ</b>
          <div className="scroll-x">
            <table className="num-table">
              <thead>
                <tr>
                  <th>k \ m</th>
                  {C.map((_, m) => <th key={m} style={{ color: m === n ? 'var(--c1)' : undefined }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {C.map((row, k) => (
                  <tr key={k}>
                    <th>{k}</th>
                    {row.map((v, m) => (
                      <td key={m} style={{ color: Math.abs(v) < 1e-12 ? 'var(--grid)' : m === n ? 'var(--c1)' : undefined }}>
                        {Math.abs(v) < 1e-12 ? '·' : fmt(v, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Takeaway label={MERKE}>
        Tridiagonal: jede Spalte enthält nur <Tex tex="p_{n-1},\,p_n,\,p_{n+1}" />.
      </Takeaway>
    </>
  );
}
