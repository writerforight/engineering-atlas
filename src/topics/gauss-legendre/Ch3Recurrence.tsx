import { useCallback, useMemo, useState } from 'react';
import { evalPoly, gramSchmidt, inner, legendreB, texNum, type Poly } from '../../core/math';
import { Canvas, Slider, Takeaway, Tex, drawGridAxes, fmt, makeViewport, plotFn, type DrawContext } from '../../core/ui';
import { clip, yRange } from './shared';

const K = 8;
const xTimes = (p: Poly): Poly => [0, ...p];

export function Ch3Recurrence() {
  const [n, setN] = useState(2);
  const P = useMemo(() => gramSchmidt(K).map((s) => s.p), []);
  const pn = P[n]!, pm = P[n - 1]!, pp = P[n + 1]!;
  const xpn = xTimes(pn);
  const num_a = inner(xpn, pn), nn = inner(pn, pn), mm = inner(pm, pm);
  const a = num_a / nn, b = nn / mm;

  /** C[k][m] ∝ ⟨x p_m, p_k⟩ / ⟨p_k, p_k⟩: coefficient of p_k in x·p_m. */
  const C = useMemo(
    () => Array.from({ length: K }, (_, k) => Array.from({ length: K }, (_, m) => inner(xTimes(P[m]!), P[k]!) / inner(P[k]!, P[k]!))),
    [P],
  );

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const y = yRange([(x) => x * evalPoly(pn, x), (x) => b * evalPoly(pm, x), (x) => evalPoly(pp, x)], -1, 1);
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y }, { l: 40, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      ctx.globalAlpha = 0.45;
      plotFn(ctx, vp, (x) => x * evalPoly(pn, x), pal.c3, 1.6);
      plotFn(ctx, vp, (x) => b * evalPoly(pm, x), pal.c4, 1.6);
      ctx.globalAlpha = 1;
      plotFn(ctx, vp, (x) => evalPoly(pp, x), pal.c1, 4);
      ctx.setLineDash([6, 5]);
      plotFn(ctx, vp, (x) => x * evalPoly(pn, x) - a * evalPoly(pn, x) - b * evalPoly(pm, x), pal.c2, 2);
      ctx.setLineDash([]);
    });
  }, [pn, pm, pp, a, b]);

  return (
    <>
      <div className="prose">
        <p>
          Her yeni polinom için bütün öncekileri çıkarmak gerekmez. <Tex tex="x\,p_n" />’in derecesi <Tex tex="n+1" />, onu
          <Tex tex="p_0,\dots,p_{n+1}" /> cinsinden yazınca katsayılar <Tex tex="\langle x p_n,p_k\rangle" /> ile orantılı. İki gözlem
          bunların çoğunu sıfırlar:
        </p>
        <ul>
          <li>
            <b>Derece:</b> x ile çarpmak dereceyi en fazla 1 artırır, yani <Tex tex="k>n+1" /> için katsayı 0.
          </li>
          <li>
            <b>Simetri:</b> <Tex tex="\langle x p_n,p_k\rangle=\langle p_n,x p_k\rangle" />. <Tex tex="k\le n-2" /> ise{' '}
            <Tex tex="x p_k" />’nin derecesi <Tex tex="<n" />, ve <Tex tex="p_n" /> bu tür her polinoma diktir: katsayı 0.
          </li>
        </ul>
        <Tex block tex="x\,p_n = p_{n+1} + a_n\,p_n + b_n\,p_{n-1},\qquad a_n=\frac{\langle x p_n,p_n\rangle}{\langle p_n,p_n\rangle},\quad b_n=\frac{\langle p_n,p_n\rangle}{\langle p_{n-1},p_{n-1}\rangle}" />
        <p>
          <Tex tex="a_n" /> için iki tarafı <Tex tex="p_n" /> ile, <Tex tex="b_n" /> için <Tex tex="p_{n-1}" /> ile iç çarp; diklik diğer
          terimleri götürür. Legendre’de simetri yüzünden <Tex tex="a_n=0" /> ve <Tex tex="b_n=\frac{n^2}{4n^2-1}" />.
        </p>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.6} maxHeight={360} ariaLabel="Rekürsiyonun kontrolü" />
          <div className="legend">
            <span><i style={{ background: 'var(--c1)' }} />p<sub>{n + 1}</sub> (Gram-Schmidt)</span>
            <span><i style={{ background: 'var(--c2)' }} />x·p<sub>{n}</sub> − b<sub>{n}</sub>·p<sub>{n - 1}</sub> (kesikli)</span>
            <span><i style={{ background: 'var(--c3)' }} />x·p<sub>{n}</sub></span>
            <span><i style={{ background: 'var(--c4)' }} />b<sub>{n}</sub>·p<sub>{n - 1}</sub></span>
          </div>
          <Slider label="n" value={n} min={1} max={K - 1} step={1} onChange={setN} format={(t) => String(t)} />
        </div>
        <div className="panel readout">
          <b>Sayılarla (n = {n})</b>
          <div className="scroll-x">
            <Tex block tex={`a_{${n}}=\\frac{\\langle x p_{${n}},p_{${n}}\\rangle}{\\langle p_{${n}},p_{${n}}\\rangle}=\\frac{${texNum(num_a)}}{${texNum(nn)}}=${texNum(a)}`} />
            <Tex block tex={`b_{${n}}=\\frac{\\langle p_{${n}},p_{${n}}\\rangle}{\\langle p_{${n - 1}},p_{${n - 1}}\\rangle}=\\frac{${texNum(nn)}}{${texNum(mm)}}=${texNum(b)}\\;\\overset{?}{=}\\;\\frac{${n * n}}{${4 * n * n - 1}}`} />
          </div>
          <p style={{ margin: 0 }}>
            Formülle fark: <span className="ok">{Math.abs(b - legendreB(n)).toExponential(1)}</span>
          </p>
          <b style={{ marginTop: 8 }}>x·pₘ’nin pₖ cinsinden katsayıları</b>
          <div className="scroll-x">
            <table className="num-table">
              <thead>
                <tr>
                  <th>k \ m</th>
                  {C.map((_, m) => <th key={m}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {C.map((row, k) => (
                  <tr key={k}>
                    <th>{k}</th>
                    {row.map((v, m) => (
                      <td key={m} style={{ color: Math.abs(v) < 1e-12 ? 'var(--grid)' : m === n ? 'var(--c2)' : undefined }}>
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
      <Takeaway>
        Derece argümanı alt üçgeni, simetri üst üçgeni sıfırlar; tablo üç köşegenli kalır. Her sütunda sadece{' '}
        <Tex tex="p_{n-1},\,p_n,\,p_{n+1}" />: üç ardışık polinom.
      </Takeaway>
    </>
  );
}
