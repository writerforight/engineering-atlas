import { useCallback, useMemo, useState } from 'react';
import { evalPoly, gramSchmidt, inner, texNum, texPoly } from '../../core/math';
import { Canvas, Slider, Takeaway, Tex, drawGridAxes, makeViewport, plotFn, type DrawContext } from '../../core/ui';
import { Choice, SERIES, clip } from './shared';

type Norm = 'monic' | 'unit';

export function Ch2GramSchmidt() {
  const [n, setN] = useState(3);
  const [norm, setNorm] = useState<Norm>('unit');
  const steps = useMemo(() => gramSchmidt(8), []);
  const scale = (k: number) => (norm === 'unit' ? 1 / Math.sqrt(inner(steps[k]!.p, steps[k]!.p)) : 1);
  const cur = steps[n]!;

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lim = norm === 'unit' ? 3.2 : 1.15;
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y: [-lim, lim] }, { l: 34, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      for (let k = 0; k <= n; k++) {
        const s = scale(k), p = steps[k]!.p;
        ctx.globalAlpha = k === n ? 1 : 0.35;
        plotFn(ctx, vp, (x) => s * evalPoly(p, x), pal[SERIES[k % 4]!], k === n ? 3 : 1.6);
      }
      ctx.globalAlpha = 1;
    });
  }, [n, norm, steps]);

  const proj = cur.coef
    .map((c, k) => (Math.abs(c) < 1e-12 ? `\\underbrace{0}_{\\langle x^{${n}},p_{${k}}\\rangle=0}\\,p_{${k}}` : `${texNum(c)}\\,p_{${k}}`))
    .join(' - ');

  return (
    <>
      <div className="prose">
        <p>
          Vektörlerdeki adımın aynısı: yeni monom <Tex tex="x^n" />’den, önceki her <Tex tex="p_k" /> doğrultusundaki bileşeni çıkar.
          Kalan parça hepsine diktir. Önceki <Tex tex="p_k" />’lar zaten birbirine dik olduğu için bileşenler ayrı ayrı hesaplanıp
          toplanabilir.
        </p>
        <Tex block tex="p_n = x^n - \sum_{k<n}\frac{\langle x^n,p_k\rangle}{\langle p_k,p_k\rangle}\,p_k ,\qquad p_0=1" />
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.62} maxHeight={380} ariaLabel="Legendre polinomları" />
          <Slider label="Son polinomun derecesi n" value={n} min={0} max={8} step={1} onChange={setN} format={(t) => String(t)} />
          <Choice
            label="Ölçek:"
            value={norm}
            onChange={setNorm}
            items={[{ id: 'unit', label: <>birim (∫p² = 1)</> }, { id: 'monic', label: <>monik (baş katsayı 1)</> }]}
          />
        </div>
        <div className="panel readout">
          <b>Bu adım (n = {n})</b>
          <div className="scroll-x">
            <Tex block tex={n === 0 ? 'p_0 = 1' : `p_{${n}} = x^{${n}} - ${proj} = ${texPoly(cur.p)}`} />
          </div>
          <b>Şu ana kadarki aile (monik)</b>
          <div className="scroll-x">
            <Tex block tex={`\\begin{aligned}${steps.slice(0, n + 1).map((s, k) => `p_{${k}} &= ${texPoly(s.p)}`).join('\\\\')}\\end{aligned}`} />
          </div>
          {norm === 'unit' && (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Grafikte <Tex tex="\tilde p_k = p_k/\|p_k\|" /> çiziliyor, böylece <Tex tex="\langle\tilde p_k,\tilde p_k\rangle=1" />.
              Şu anki çarpan: <Tex tex={`1/\\|p_{${n}}\\| = ${scale(n).toFixed(4)}`} />
            </p>
          )}
        </div>
      </div>
      <Takeaway>
        Paydada hiçbir zaman 0 olmaz: <Tex tex="\langle p_k,p_k\rangle=\int p_k^2>0" />. Sıfır çıkan pay ise simetriden gelir,
        örneğin <Tex tex="\langle x^2,x\rangle=\int x^3=0" />.
      </Takeaway>
    </>
  );
}
