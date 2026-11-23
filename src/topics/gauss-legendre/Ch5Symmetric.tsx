import { useCallback, useMemo, useState } from 'react';
import { gaussLegendre, jacobiMatrix, legendreB, monicValues, recurrenceT, scalingD, texNum } from '../../core/math';
import { Canvas, Slider, Takeaway, Tex, drawGridAxes, fmt, makeViewport, texMatrix, type DrawContext } from '../../core/ui';

const texFrac = (M: number[][]) => `\\begin{bmatrix}${M.map((r) => r.map((v) => texNum(v)).join('&')).join('\\\\')}\\end{bmatrix}`;
const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  const s = v[0]! < 0 ? -1 : 1;
  return v.map((t) => (s * t) / n);
};

export function Ch5Symmetric() {
  const [N, setN] = useState(3);
  const [i, setI] = useState(0);
  const T = useMemo(() => recurrenceT(N), [N]);
  const J = useMemo(() => jacobiMatrix(N), [N]);
  const d = useMemo(() => scalingD(N), [N]);
  const g = useMemo(() => gaussLegendre(N), [N]);
  const ii = Math.min(i, N - 1);
  const xi = g.x[ii]!;
  const pT = monicValues(N - 1, xi);
  const vT = unit(pT);
  const vJ = unit(pT.map((t, k) => d[k]! * t));
  const vEig = unit(g.V.map((r) => r[ii]!));
  const resT = Math.max(...T.map((r, k) => Math.abs(r.reduce((s, t, j) => s + t * pT[j]!, 0) - xi * pT[k]!)));

  const draw = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = makeViewport(width, height, { x: [-0.5, N - 0.5], y: [-1.05, 1.05] }, { l: 34, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: N, xLabel: 'bileşen k' });
    const w = (vp.x(1) - vp.x(0)) * 0.36;
    const bar = (k: number, val: number, off: number, col: string) => {
      ctx.fillStyle = col;
      const y0 = vp.y(0), y1 = vp.y(val);
      ctx.fillRect(vp.x(k) + off, Math.min(y0, y1), w, Math.abs(y1 - y0));
    };
    vT.forEach((v, k) => bar(k, v, -w, pal.c2));
    vJ.forEach((v, k) => bar(k, v, 0, pal.c1));
  }, [N, vT, vJ]);

  return (
    <>
      <div className="prose">
        <p>
          <Tex tex="T" /> simetrik değil: üstte 1, altta <Tex tex="b_k" />. Köşegen bir <Tex tex="D" /> ile ölçekleyince
          (benzerlik dönüşümü) iki taraf eşitlenebilir:
        </p>
        <Tex block tex="J=D\,T\,D^{-1},\qquad J_{k,k+1}=\frac{d_k}{d_{k+1}},\quad J_{k+1,k}=\frac{d_{k+1}}{d_k}\,b_{k+1}\;\Rightarrow\; d_{k+1}=\frac{d_k}{\sqrt{b_{k+1}}},\quad J_{k,k+1}=J_{k+1,k}=\sqrt{b_{k+1}}=\beta_{k+1}" />
        <p>
          <Tex tex="d_k = 1/\|p_k\|" /> çıkar, yani <Tex tex="D" /> tam olarak 2. bölümdeki <b>normlama</b>. Özdeğerler neden değişmez?{' '}
          <Tex tex="T=V\Lambda V^{-1}" /> ise <Tex tex="J=DV\,\Lambda\,(DV)^{-1}" />: ortada aynı <Tex tex="\Lambda" />, sadece özvektörler{' '}
          <Tex tex="V\to DV" /> olur.
        </p>
      </div>
      <div className="panel scroll-x">
        <Tex
          block
          tex={`\\underbrace{${texMatrix(d.map((v, r) => d.map((_, c) => (r === c ? v : 0))), 3)}}_{D}\\;\\underbrace{${texFrac(T)}}_{T}\\;\\underbrace{${texMatrix(d.map((v, r) => d.map((_, c) => (r === c ? 1 / v : 0))), 3)}}_{D^{-1}} = \\underbrace{${texMatrix(J, 4)}}_{J\\ \\text{(simetrik)}}`}
        />
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.55} maxHeight={300} ariaLabel="Özvektör bileşenleri" />
          <div className="legend">
            <span><i style={{ background: 'var(--c2)' }} />T’nin özvektörü p(xᵢ), normlu</span>
            <span><i style={{ background: 'var(--c1)' }} />J’nin özvektörü D·p(xᵢ), normlu</span>
          </div>
          <Slider label="N" value={N} min={2} max={6} step={1} onChange={(t) => { setN(t); setI(0); }} format={(t) => String(t)} />
          <div className="row">
            {g.x.map((r, k) => (
              <button key={k} className="btn" aria-pressed={k === ii} onClick={() => setI(k)}>
                λ<sub>{k + 1}</sub> = {r.toFixed(4)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel readout">
          <b>Seçilen özdeğer λ = {xi.toFixed(6)}</b>
          <p style={{ margin: 0 }}>
            T için kontrol: <Tex tex="\max|T\,p(\lambda)-\lambda\,p(\lambda)|" /> = <span className="ok">{resT.toExponential(1)}</span>
          </p>
          <p style={{ margin: 0 }}>
            J’nin özvektörü (eigh) ile <Tex tex="D\,p(\lambda)" /> farkı:{' '}
            <span className="ok">{Math.max(...vEig.map((t, k) => Math.abs(t - vJ[k]!))).toExponential(1)}</span>
          </p>
          <table className="num-table">
            <thead><tr><th>k</th><th>p(λ)</th><th>D·p(λ), normlu</th></tr></thead>
            <tbody>
              {pT.map((t, k) => (
                <tr key={k}><td>{k}</td><td>{fmt(t, 4)}</td><td>{fmt(vJ[k]!, 4)}</td></tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            β değerleri: {Array.from({ length: N - 1 }, (_, k) => `β${k + 1} = ${Math.sqrt(legendreB(k + 1)).toFixed(4)}`).join(', ')}
          </p>
        </div>
      </div>
      <Takeaway>
        Özdeğerler (düğümler) aynı kalır, özvektörler değişir. Simetrik <Tex tex="J" />’nin özdeğerleri kesin gerçel ve kararlı
        hesaplanır (<code>eigh</code>); <Tex tex="\beta_k=(4-k^{-2})^{-1/2}" />.
      </Takeaway>
    </>
  );
}
