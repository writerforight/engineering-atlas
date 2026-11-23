import { useCallback, useMemo, useState } from 'react';
import { gaussLegendre, legendreB, monicValues, texNum } from '../../core/math';
import { Canvas, Slider, Takeaway, Tex, dot, drawGridAxes, fmt, makeViewport, plotFn, polyline, type CanvasPointer, type DrawContext } from '../../core/ui';
import { clip } from './shared';

function texT(N: number, extra: boolean): string {
  const rows = Array.from({ length: N }, (_, k) =>
    Array.from({ length: N + (extra ? 1 : 0) }, (_, j) => {
      if (j === k + 1) return j === N ? '\\boxed{1}' : '1';
      if (j === k - 1) return texNum(legendreB(k));
      return '0';
    }).join('&'),
  );
  return `\\begin{bmatrix}${rows.join('\\\\')}\\end{bmatrix}`;
}

export function Ch4Matrix() {
  const [N, setN] = useState(3);
  const [x, setX] = useState(0.5);
  const roots = useMemo(() => gaussLegendre(N).x, [N]);
  const v = monicValues(N, x);
  const pN = v[N]!;
  const onRoot = Math.abs(pN) < 1e-9;
  const yLim = Math.max(0.3, ...Array.from({ length: 101 }, (_, i) => Math.abs(monicValues(N, -1 + i / 50)[N]!))) * 1.15;

  const view = useCallback((w: number, h: number) => makeViewport(w, h, { x: [-1.05, 1.05], y: [-yLim, yLim] }, { l: 40, r: 10, t: 12, b: 24 }), [yLim]);
  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = view(width, height);
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x', yLabel: `p${N}(x)` });
    clip(ctx, vp, () => {
      plotFn(ctx, vp, (t) => monicValues(N, t)[N]!, pal.c1, 2.5);
      roots.forEach((r) => dot(ctx, vp, [r, 0], pal.c3, 5));
      polyline(ctx, vp, [[x, 0], [x, pN]], pal.c2, 2, [4, 3]);
      dot(ctx, vp, [x, pN], pal.c2, 6);
    });
  }, [N, roots, x, pN, view]);
  const onPointer = useCallback((p: CanvasPointer) => {
    if (p.type === 'up' || !p.buttons) return;
    const t = view(p.width, p.height).x.invert(p.x);
    const near = roots.find((r) => Math.abs(r - t) < 0.03);
    setX(Math.max(-1, Math.min(1, near ?? t)));
  }, [roots, view]);

  const vec = (vals: number[]) => `\\begin{bmatrix}${vals.map((t) => fmt(t, 3)).join('\\\\')}\\end{bmatrix}`;
  const pv = v.slice(0, N);
  const Tp = pv.map((_, k) => (k + 1 < N ? pv[k + 1]! : 0) + (k >= 1 ? legendreB(k) * pv[k - 1]! : 0));

  return (
    <>
      <div className="prose">
        <p>
          Rekürsiyonu <Tex tex="n=0,\dots,N-1" /> için alt alta yazınca (Legendre’de <Tex tex="a_n=0" />) her satır bir denklem olur.
          Son satırda <Tex tex="p_N" /> de geçer, ama o vektörde yok: sistem aslında <Tex tex="N\times(N+1)" />.
        </p>
        <div className="scroll-x">
          <Tex block tex={`x\\begin{bmatrix}p_0\\\\ \\vdots\\\\ p_{${N - 1}}\\end{bmatrix} = ${texT(N, true)}\\begin{bmatrix}p_0\\\\ \\vdots\\\\ p_{${N - 1}}\\\\ \\boxed{p_{${N}}}\\end{bmatrix} = ${texT(N, false)}\\begin{bmatrix}p_0\\\\ \\vdots\\\\ p_{${N - 1}}\\end{bmatrix} + \\boxed{p_{${N}}(x)}\\,e_{${N}}`} />
        </div>
        <p>
          <b>Hile:</b> <Tex tex="x" /> yerine <Tex tex={`p_{${N}}`} />’in bir kökünü koy. Kutulu terim sıfır olur, fazla sütun kaybolur ve geriye bir
          özdeğer denklemi kalır: <Tex tex="T\,p(x_i)=x_i\,p(x_i)" />.
        </p>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.55} maxHeight={320} onPointer={onPointer} ariaLabel="p_N ve seçilen x" />
          <p className="canvas-caption">Grafikte sürükle; yeşil noktalara (köklere) yaklaşınca yapışır.</p>
          <Slider label="N (matris boyutu)" value={N} min={2} max={7} step={1} onChange={(t) => { setN(t); setX(0.5); }} format={(t) => String(t)} />
          <Slider label="x" value={x} min={-1} max={1} step={0.001} onChange={setX} format={(t) => t.toFixed(3)} />
          <div className="row">
            {roots.map((r, i) => (
              <button key={i} className="btn" aria-pressed={Math.abs(r - x) < 1e-12} onClick={() => setX(r)}>
                x<sub>{i + 1}</sub> = {r.toFixed(4)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel readout">
          <b>Seçilen x için iki taraf</b>
          <div className="scroll-x">
            <Tex block tex={`x\\,p(x)=${vec(pv.map((t) => x * t))},\\qquad T\\,p(x)=${vec(Tp)}`} />
          </div>
          <p style={{ margin: 0 }}>
            Fark yalnızca son satırda ve tam olarak <Tex tex={`p_{${N}}(x)`} /> ={' '}
            <b className={onRoot ? 'ok' : 'bad'}>{onRoot ? '0' : pN.toExponential(3)}</b>
          </p>
          <p style={{ margin: 0 }} className={onRoot ? 'ok' : undefined}>
            {onRoot
              ? `x bir kök: sistem kare oldu, T·p = x·p. x = ${x.toFixed(6)} bir özdeğer.`
              : 'Bir köke git (düğmeler), fazla sütunun nasıl kaybolduğunu gör.'}
          </p>
        </div>
      </div>
      <Takeaway>
        <Tex tex={`p_{${N}}`} />’in kökleri, <Tex tex={`${N}\\times${N}`} /> matris <Tex tex="T" />’nin özdeğerleridir. Kök bulma problemi bir
        özdeğer problemine dönüştü.
      </Takeaway>
    </>
  );
}
