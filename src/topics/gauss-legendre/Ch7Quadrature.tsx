import { useCallback, useMemo, useState } from 'react';
import { cellWidths, gaussLegendre, momentWeights, simpson, transformRule } from '../../core/math';
import { Callout, Canvas, Slider, Takeaway, Tex, dot, drawGridAxes, fmt, fmtErr, makeViewport, plotFn, polyline, type DrawContext } from '../../core/ui';
import { Choice, clip, yRange } from './shared';

const FUNCS = [
  { id: 'exp', label: 'eˣ', tex: 'e^x', f: Math.exp },
  { id: 'sin', label: 'sin 3x + 1,5', tex: '\\sin 3x+1{,}5', f: (x: number) => Math.sin(3 * x) + 1.5 },
  { id: 'poly', label: 'x⁶ − x² + 1', tex: 'x^6-x^2+1', f: (x: number) => x ** 6 - x * x + 1 },
  { id: 'runge', label: '1/(1+25x²)', tex: '\\frac{1}{1+25x^2}', f: (x: number) => 1 / (1 + 25 * x * x) },
  { id: 'abs', label: '|x|', tex: '|x|', f: Math.abs },
] as const;
type FId = (typeof FUNCS)[number]['id'];
type Method = 'cells' | 'gauss';

/** max |w_moment − w_Gauss| for N = 40, computed once. */
const MOMENT_GAP_40 = (() => {
  const g = gaussLegendre(40), w = momentWeights(g.x);
  return Math.max(...w.map((v, i) => Math.abs(v - g.w[i]!)));
})();

export function Ch7Quadrature() {
  const [fid, setFid] = useState<FId>('exp');
  const [N, setN] = useState(3);
  const [a, setA] = useState(-1);
  const [b, setB] = useState(1);
  const [method, setMethod] = useState<Method>('gauss');
  const fn = FUNCS.find((t) => t.id === fid)!;
  const f = fn.f;

  const ref = useMemo(() => gaussLegendre(N), [N]);
  const rule = useMemo(() => transformRule(ref, a, b), [ref, a, b]);
  const cells = useMemo(() => cellWidths(rule.x, a, b), [rule, a, b]);
  const fx = rule.x.map(f);
  const exact = useMemo(() => (fid === 'abs' && a < 0 && b > 0 ? (a * a + b * b) / 2 : simpson(f, a, b, 4000)), [f, fid, a, b]);
  const Qg = fx.reduce((s, v, i) => s + rule.w[i]! * v, 0);
  const Qc = fx.reduce((s, v, i) => s + cells[i]! * v, 0);
  const wm = useMemo(() => momentWeights(ref.x), [ref]);
  const gap = Math.max(...wm.map((v, i) => Math.abs(v - ref.w[i]!)));

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const span = b - a;
    const [lo, hi] = yRange([f], a, b, 0.12);
    const vp = makeViewport(width, height, { x: [a - 0.04 * span, b + 0.04 * span], y: [Math.min(0, lo), Math.max(0, hi)] }, { l: 40, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      const widths = method === 'gauss' ? rule.w : cells;
      let left = a;
      widths.forEach((w, i) => {
        const x0 = vp.x(left), x1 = vp.x(left + w), y0 = vp.y(0), y1 = vp.y(fx[i]!);
        ctx.fillStyle = method === 'gauss' ? pal.c1 : pal.c2;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = method === 'gauss' ? pal.c1 : pal.c2;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
        ctx.globalAlpha = 1;
        left += w;
      });
      plotFn(ctx, vp, f, pal.fg, 2.5, 600);
      rule.x.forEach((xi, i) => {
        polyline(ctx, vp, [[xi, 0], [xi, fx[i]!]], pal.c3, 1.5, [3, 3]);
        dot(ctx, vp, [xi, fx[i]!], pal.c3, 5);
        dot(ctx, vp, [xi, 0], pal.c3, 3);
      });
    });
  }, [a, b, f, fx, rule, cells, method]);

  return (
    <>
      <div className="prose">
        <p>
          Asıl hedef bir integrali birkaç fonksiyon değerinden hesaplamak:
        </p>
        <Tex block tex="\int_a^b f(x)\,dx\;\approx\;Q=\sum_{i=1}^{N} w_i\,f(x_i)" />
        <p>
          <b>Quadraturformel</b> = <Tex tex="(x,w)" /> çifti: hangi noktalarda ölçeceğin ve her ölçümü neyle çarpacağın. Düğümler{' '}
          <Tex tex="[-1,1]" /> üzerinde hesaplanır, sonra kaydırılıp ölçeklenir; ağırlıklar da aynı oranla ölçeklenir:
        </p>
        <Tex block tex="x_i=\tfrac{a+b}{2}+\tfrac{b-a}{2}\,\hat x_i,\qquad w_i=\tfrac{b-a}{2}\,\hat w_i" />
        <p>Soru: <Tex tex="f(x_i)" /> değerlerini neyle çarpıp toplayalım? İki aday:</p>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.58} maxHeight={400} ariaLabel="Kuadratür dikdörtgenleri" />
          <p className="canvas-caption">
            Dikdörtgen <i>i</i>: genişlik = ağırlık, yükseklik = <Tex tex="f(x_i)" />, yan yana dizilmiş. Yeşil: düğümler ve değerleri.
          </p>
          <Choice
            value={method}
            onChange={setMethod}
            items={[{ id: 'cells', label: '1) Yatay aralık genişliği' }, { id: 'gauss', label: '2) Gauß-Gewichte (J’den)' }]}
          />
          <Choice value={fid} onChange={setFid} items={FUNCS.map((t) => ({ id: t.id, label: t.label }))} />
          <Slider label="Düğüm sayısı N" value={N} min={1} max={12} step={1} onChange={setN} format={(t) => String(t)} />
          <Slider label="a" value={a} min={-3} max={2.5} step={0.05} onChange={(t) => { setA(t); if (b < t + 0.5) setB(t + 0.5); }} format={(t) => t.toFixed(2)} />
          <Slider label="b" value={b} min={-2.5} max={3} step={0.05} onChange={(t) => { setB(t); if (a > t - 0.5) setA(t - 0.5); }} format={(t) => t.toFixed(2)} />
        </div>
        <div className="panel readout">
          <b>Sonuç</b>
          <table className="num-table">
            <tbody>
              <tr><td style={{ textAlign: 'left' }}>Gerçek integral</td><td>{exact.toFixed(10)}</td><td /></tr>
              <tr><td style={{ textAlign: 'left', color: 'var(--c2)' }}>1) aralık genişliği</td><td>{Qc.toFixed(10)}</td><td>{fmtErr(Math.abs(Qc - exact))}</td></tr>
              <tr><td style={{ textAlign: 'left', color: 'var(--c1)' }}>2) Gauß</td><td>{Qg.toFixed(10)}</td><td>{fmtErr(Math.abs(Qg - exact))}</td></tr>
            </tbody>
          </table>
          <b style={{ marginTop: 8 }}>Düğümler ve değerler</b>
          <div className="scroll-x">
            <table className="num-table">
              <thead><tr><th>i</th><th>xᵢ</th><th>f(xᵢ)</th><th>wᵢ Gauß</th><th>hücre</th></tr></thead>
              <tbody>
                {rule.x.map((xi, i) => (
                  <tr key={i}><td>{i + 1}</td><td>{fmt(xi, 5)}</td><td>{fmt(fx[i]!, 5)}</td><td>{fmt(rule.w[i]!, 5)}</td><td>{fmt(cells[i]!, 5)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="viz-grid">
        <Callout title="Benim önerim: moment sistemi">
          Ağırlıkları, <Tex tex="0,\dots,N-1" />. dereceye kadar her monomu tam integre edecek şekilde de seçebiliriz:{' '}
          <Tex tex="\sum_i w_i\,\hat x_i^{\,k}=\int_{-1}^1 x^k\,dx" />. Bu <Tex tex="A\,w=\mu" /> lineer sistemi (A bir Vandermonde matrisi)
          çözülünce <b>aynı ağırlıklar</b> çıkar. Şu anki N için fark: <b>{fmtErr(gap)}</b>. Ama monomlar yüksek derecede birbirine
          benzediği için A kötü koşulludur; N = 40’ta fark <b className="bad">{fmtErr(MOMENT_GAP_40)}</b>. Bu yüzden ağırlıkları J’den
          alıyoruz.
        </Callout>
        <Callout kind="warn" title="Açık nokta">
          Ağırlığın neden <Tex tex="\hat w_i=2\,(v_i)_1^2" /> olduğunu (özvektörün ilk bileşeni) sezgisel olarak henüz tam
          oturtmadım. Türetmesi Christoffel formülünden geliyor, aşağıdaki “Adım adım türetme” bölümünde.
        </Callout>
      </div>
      <Takeaway>
        Gauß dikdörtgenleri eğriyi takip etmez; fazla ve eksik alanlar birbirini götürür. <Tex tex="x^6-x^2+1" /> ile N = 4 dene: hata
        makine hassasiyetinde, çünkü derece 6 ≤ 2N − 1 = 7.
      </Takeaway>
    </>
  );
}
