import { useCallback, useMemo, useState } from 'react';
import { exactnessDegree, gaussLegendre, monicNormSq, monomialErrors, quad } from '../../core/math';
import { Canvas, Slider, Takeaway, Tex, dot, drawGridAxes, fmtErr, makeViewport, polyline, type DrawContext } from '../../core/ui';
import { clip } from './shared';

const N_MAX = 40;
const EPS = 2.220446049250313e-16;
/** "vorab": all 40 rules computed once. */
const RULES = Array.from({ length: N_MAX }, (_, i) => gaussLegendre(i + 1));
const FLOOR = 1e-18;

/** Deterministic pseudo-random in [-1, 1]. */
function noise(seed: number, i: number): number {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return 2 * (s - Math.floor(s)) - 1;
}

export function Ch8Exactness() {
  const [N, setN] = useState(18);
  const [logTol, setLogTol] = useState(-10);
  const [logDelta, setLogDelta] = useState(-6);
  const [seed, setSeed] = useState(1);
  const tol = 10 ** logTol, delta = 10 ** logDelta;
  const rule = RULES[N - 1]!;
  const errs = useMemo(() => monomialErrors(rule, 2 * N + 6), [rule, N]);
  const measured = exactnessDegree(rule, tol);
  const degrees = useMemo(() => RULES.map((r) => exactnessDegree(r, tol)), [tol]);
  const sumW = rule.w.reduce((s, w) => s + Math.abs(w), 0);
  const pN2 = monicNormSq(N);
  const firstOff = degrees.findIndex((m, i) => m !== 2 * (i + 1) - 1);

  const Q = quad(rule, Math.exp);
  const Qt = rule.x.reduce((s, x, i) => s + rule.w[i]! * (Math.exp(x) + delta * noise(seed, i)), 0);

  const drawErr = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const kMax = errs.length - 1;
    const vp = makeViewport(width, height, { x: [-0.5, kMax + 0.5], y: [-18, 1] }, { l: 40, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'k', yLabel: 'log₁₀ |Q(xᵏ) − ∫xᵏ|' });
    clip(ctx, vp, () => {
      polyline(ctx, vp, [[-1, logTol], [kMax + 1, logTol]], pal.c2, 1.5, [6, 4]);
      polyline(ctx, vp, [[2 * N - 0.5, -18], [2 * N - 0.5, 1]], pal.axis, 1, [2, 3]);
      errs.forEach((e, k) => {
        const y = Math.log10(Math.max(FLOOR, e));
        const bad = e > tol;
        polyline(ctx, vp, [[k, -18], [k, y]], bad ? pal.c2 : pal.c1, 2);
        dot(ctx, vp, [k, y], bad ? pal.c2 : pal.c1, k === measured + 1 ? 6 : 3.5);
      });
    });
  }, [errs, logTol, tol, N, measured]);

  const drawDeg = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vp = makeViewport(width, height, { x: [0, N_MAX + 1], y: [0, Math.max(90, ...degrees) * 1.05] }, { l: 40, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'N', yLabel: 'Exaktheitsgrad' });
    clip(ctx, vp, () => {
      polyline(ctx, vp, [[0, -1], [N_MAX + 1, 2 * N_MAX + 1]], pal.muted, 1.5, [6, 4]);
      degrees.forEach((m, i) => dot(ctx, vp, [i + 1, m], m === 2 * (i + 1) - 1 ? pal.c1 : pal.c2, i + 1 === N ? 6 : 3.5));
    });
  }, [degrees, N]);

  return (
    <>
      <div className="prose">
        <p>
          Teori (Satz): <Tex tex="N" /> düğümlü Gauß formülü <Tex tex="2N-1" />. dereceye kadar her polinomu tam integre eder. Bunu{' '}
          <b>ölçüyoruz</b>: <Tex tex="N=1,\dots,40" /> için formüller bir kez hesaplanır, sonra her biri monomlarla{' '}
          <Tex tex="x^0,x^1,x^2,\dots" /> sınanır. Sapma ilk kez <Tex tex="\text{tol}" />’u geçtiği <Tex tex="k" />’da durulur:{' '}
          <b>Exaktheitsgrad</b> <Tex tex="m=k-1" />.
        </p>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawErr} aspect={0.55} maxHeight={330} ariaLabel="Monom hataları" />
          <p className="canvas-caption">
            Mavi: tol altında (tam sayılır), turuncu: tol üstünde. Kesikli turuncu çizgi tol, noktalı dikey çizgi k = 2N.
          </p>
          <Slider label="N" value={N} min={1} max={N_MAX} step={1} onChange={setN} format={(t) => String(t)} />
          <Slider label="tol" value={logTol} min={-16} max={-4} step={0.5} onChange={setLogTol} format={(t) => `1e${t}`} />
        </div>
        <div className="panel">
          <Canvas draw={drawDeg} aspect={0.55} maxHeight={330} ariaLabel="Ölçülen exaktlık derecesi" />
          <p className="canvas-caption">Kesikli: teori 2N − 1. Mavi: uyuşuyor, turuncu: uyuşmuyor.</p>
          <div className="readout">
            <span>N = {N}: ölçülen m = <b className={measured === 2 * N - 1 ? 'ok' : 'bad'}>{measured}</b>, teori 2N − 1 = {2 * N - 1}</span>
            <span>Bu tol ile ilk sapma: {firstOff < 0 ? 'yok (N ≤ 40)' : `N = ${firstOff + 1}`}</span>
            <span>Konditionszahl Σ|wᵢ| = {sumW.toFixed(15)}</span>
          </div>
        </div>
      </div>
      <div className="viz-grid">
        <div className="panel readout">
          <b>Störung: değerler bozulursa ne olur?</b>
          <Tex block tex="|Q(\tilde f)-Q(f)|\le\sum_i|w_i|\cdot\max_i|\tilde f(x_i)-f(x_i)|" />
          <Slider label="δ (değerlerdeki en büyük hata)" value={logDelta} min={-14} max={-1} step={0.5} onChange={setLogDelta} format={(t) => `1e${t}`} />
          <div className="row">
            <button className="btn" onClick={() => setSeed((s) => s + 1)}>Yeni gürültü</button>
          </div>
          <span>f = eˣ, N = {N}: |Q(f̃) − Q(f)| = <b>{fmtErr(Math.abs(Qt - Q))}</b> ≤ Σ|wᵢ|·δ = <b>{fmtErr(sumW * delta)}</b></span>
        </div>
        <div className="panel readout">
          <b>Soru: Yuvarlama hatası sapmayı açıklar mı?</b>
          <span>Yuvarlama × kondisyon ≈ Σ|wᵢ|·ε = <b>{fmtErr(sumW * EPS)}</b></span>
          <span>
            x<sup>2N</sup>’deki gerçek Gauß hatası ‖p<sub>N</sub>‖² = <b>{fmtErr(pN2)}</b> (tablodaki k = 2N: {fmtErr(errs[2 * N]!)})
          </span>
          <span className={pN2 < tol ? 'bad' : 'ok'}>
            ‖p<sub>N</sub>‖²{' '}
            {pN2 < tol
              ? '< tol: test k = 2N’deki gerçek hatayı göremiyor, ölçülen derece teoriden büyük çıkıyor. Sebep yuvarlama değil, tol.'
              : '> tol: k = 2N’deki hata yakalanıyor, ölçülen = teori.'}
          </span>
        </div>
      </div>
      <Takeaway>
        Ölçülen derece teoriden sapıyorsa suçlu yuvarlama değil: <Tex tex="\sum|w_i|\,\varepsilon\approx4\cdot10^{-16}" />. Gerçek hata{' '}
        <Tex tex="\|p_N\|^2\sim4^{-N}" /> hızla küçülür ve <Tex tex="\text{tol}" />’un altına düşünce test onu “tam” sayar.
      </Takeaway>
    </>
  );
}
