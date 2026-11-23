import { useCallback, useMemo, useState } from 'react';
import { evalPoly, gramSchmidt, inner, texNum, texPoly } from '../../core/math';
import { Canvas, KeyIdentity, Slider, Takeaway, Tex, drawGridAxes, makeViewport, plotFn, type DrawContext } from '../../core/ui';
import { Choice, CurveToggle, MERKE, SERIES, clip, toggle } from './shared';

type Norm = 'monic' | 'unit';
const K = 8;

export function Ch2GramSchmidt() {
  const [n, setN] = useState(3);
  const [norm, setNorm] = useState<Norm>('unit');
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const steps = useMemo(() => gramSchmidt(K), []);
  const scale = useCallback((k: number) => (norm === 'unit' ? 1 / Math.sqrt(inner(steps[k]!.p, steps[k]!.p)) : 1), [norm, steps]);
  const cur = steps[n]!;

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lim = norm === 'unit' ? 3.2 : 1.15;
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y: [-lim, lim] }, { l: 34, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      for (let k = 0; k <= n; k++) {
        if (hidden.has(k)) continue;
        const s = scale(k), p = steps[k]!.p;
        plotFn(ctx, vp, (x) => s * evalPoly(p, x), pal[SERIES[k % 4]!], k === n ? 3.5 : 2);
      }
    });
  }, [n, norm, steps, hidden, scale]);

  const proj = cur.coef.map((c, k) => `${texNum(c)}\\,p_{${k}}`).join(' - ');

  return (
    <>
      <KeyIdentity label="Gram-Schmidt">
        <Tex block tex="p_0=1,\qquad p_n = x^n - \sum_{k<n}\frac{\langle x^n,p_k\rangle}{\langle p_k,p_k\rangle}\,p_k" />
      </KeyIdentity>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.62} maxHeight={380} ariaLabel="Legendre-Polynome" />
          <div className="row">
            {Array.from({ length: n + 1 }, (_, k) => (
              <CurveToggle key={k} on={!hidden.has(k)} onClick={() => setHidden(toggle(hidden, k))} color={`var(--${SERIES[k % 4]})`}>
                p<sub>{k}</sub>
              </CurveToggle>
            ))}
          </div>
          <Slider label="Grad n" value={n} min={0} max={K} step={1} onChange={setN} format={(t) => String(t)} />
          <Choice
            label="Skalierung:"
            value={norm}
            onChange={setNorm}
            items={[{ id: 'unit', label: <>normiert (∫p² = 1)</> }, { id: 'monic', label: <>monisch (Leitkoeffizient 1)</> }]}
          />
        </div>
        <div className="panel readout">
          <b>Schritt n = {n}</b>
          <div className="scroll-x">
            <Tex block tex={n === 0 ? 'p_0 = 1' : `p_{${n}} = x^{${n}} - ${proj}`} />
            <Tex block tex={`\\phantom{p_{${n}}} = ${texPoly(cur.p)}`} />
          </div>
          <b>Bisher (monisch)</b>
          <div className="scroll-x">
            <Tex block tex={`\\begin{aligned}${steps.slice(0, n + 1).map((s, k) => `p_{${k}} &= ${texPoly(s.p)}`).join('\\\\')}\\end{aligned}`} />
          </div>
          {norm === 'unit' && <Tex tex={`\\tilde p_{${n}} = p_{${n}}/\\|p_{${n}}\\|,\\quad 1/\\|p_{${n}}\\| = ${scale(n).toFixed(4)}`} />}
        </div>
      </div>
      <Takeaway label={MERKE}>
        <Tex tex="\langle p_k,p_k\rangle=\int p_k^2>0" /> (nie 0/0); Nullen im Zähler kommen aus der Symmetrie, z. B.{' '}
        <Tex tex="\langle x^2,x\rangle=\int x^3\,dx=0" />.
      </Takeaway>
    </>
  );
}
