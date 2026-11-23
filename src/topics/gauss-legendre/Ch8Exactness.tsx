import { useCallback, useMemo, useState } from 'react';
import { exactnessDegree, gaussLegendre, monicNormSq, monomialErrors, quad } from '../../core/math';
import { Canvas, KeyIdentity, Slider, Takeaway, Tex, dot, drawGridAxes, makeViewport, polyline, type DrawContext } from '../../core/ui';
import { MERKE, clip, pow10 } from './shared';

const N_MAX = 40;
const EPS = Number.EPSILON;
/** "vorab": all 40 rules computed once. */
const RULES = Array.from({ length: N_MAX }, (_, i) => gaussLegendre(i + 1));
const FLOOR = 1e-18;
const sup = (e: number) => String(e).replace(/-/g, '⁻').replace(/\.5/, ',5').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!);

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
  const measured = exactnessDegree(rule, tol);
  const errs = useMemo(() => monomialErrors(rule, Math.min(200, Math.max(2 * N + 6, measured + 4))), [rule, N, measured]);
  const degrees = useMemo(() => RULES.map((r) => exactnessDegree(r, tol)), [tol]);
  const sumW = rule.w.reduce((s, w) => s + Math.abs(w), 0);
  const pN2 = monicNormSq(N);
  const roundFloor = Math.max(...errs.slice(0, 2 * N));
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
    const vp = makeViewport(width, height, { x: [0, N_MAX + 1], y: [-2, Math.max(90, ...degrees) * 1.05] }, { l: 40, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'N', yLabel: 'Exaktheitsgrad' });
    clip(ctx, vp, () => {
      polyline(ctx, vp, [[0, -1], [N_MAX + 1, 2 * N_MAX + 1]], pal.muted, 1.5, [6, 4]);
      degrees.forEach((m, i) => {
        const th = 2 * (i + 1) - 1;
        dot(ctx, vp, [i + 1, m], m === th ? pal.c1 : m > th ? pal.c2 : pal.c4, i + 1 === N ? 6 : 3.5);
      });
    });
  }, [degrees, N]);

  const verdict =
    measured === 2 * N - 1
      ? { cls: 'ok', text: <>gemessen = Theorie.</> }
      : measured > 2 * N - 1
        ? { cls: 'bad', text: <>gemessen &gt; Theorie: der echte Fehler bei x<sup>2N</sup>, ‖p<sub>N</sub>‖² = {pow10(pN2)}, liegt unter tol. Ursache ist tol, nicht Rundung.</> }
        : { cls: 'bad', text: <>gemessen &lt; Theorie: tol liegt unter dem Rundungsniveau {pow10(roundFloor)} der Gleitkommazahlen (double, ε ≈ 2,2·10⁻¹⁶). Schon exakte Monome „scheitern“.</> };

  return (
    <>
      <KeyIdentity label="Exaktheitsgrad messen">
        <Tex block tex="m=\max\Big\{m:\ \Big|\sum_i w_i x_i^{\,k}-\int_{-1}^1x^k\,dx\Big|\le\text{tol}\ \ \forall k\le m\Big\}" />
        <Tex block tex="\text{Theorie: }m=2N-1" />
      </KeyIdentity>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawErr} aspect={0.55} maxHeight={330} ariaLabel="Monomfehler" />
          <p className="canvas-caption">Blau ≤ tol, orange &gt; tol. Gestrichelt: tol. Gepunktet: k = 2N.</p>
          <Slider label="N" value={N} min={1} max={N_MAX} step={1} onChange={setN} format={(t) => String(t)} />
          <Slider label="tol" value={logTol} min={-16} max={-4} step={0.5} onChange={setLogTol} format={(t) => `10${sup(t)}`} />
        </div>
        <div className="panel">
          <Canvas draw={drawDeg} aspect={0.55} maxHeight={330} ariaLabel="Gemessener Exaktheitsgrad" />
          <p className="canvas-caption">Gestrichelt: 2N − 1. Blau: stimmt, orange: zu groß, violett: zu klein.</p>
          <div className="readout">
            <span>
              N = {N}: gemessen <b className={verdict.cls}>{measured}</b>, Theorie {2 * N - 1}
            </span>
            <span>Konditionszahl Σ|wᵢ| = {sumW.toFixed(15)}</span>
          </div>
        </div>
      </div>
      <div className="viz-grid">
        <div className="panel readout">
          <b>Frage: Erklären Rundungsfehler die Abweichung?</b>
          <span>Rundung × Kondition: Σ|wᵢ|·ε = <b>{pow10(sumW * EPS)}</b></span>
          <span>Größter Fehler für k &lt; 2N (reine Rundung): <b>{pow10(roundFloor)}</b></span>
          <span>Echter Fehler bei k = 2N: ‖p<sub>N</sub>‖² = <b>{pow10(pN2)}</b></span>
          <span className={verdict.cls}>{verdict.text}</span>
        </div>
        <div className="panel readout">
          <b>Störung der Werte</b>
          <Tex block tex="|Q(\tilde f)-Q(f)|\le\sum_i|w_i|\cdot\max_i|\tilde f(x_i)-f(x_i)|" />
          <Slider label="δ = max |f̃ − f|" value={logDelta} min={-14} max={-1} step={0.5} onChange={setLogDelta} format={(t) => `10${sup(t)}`} />
          <div className="row">
            <button className="btn" onClick={() => setSeed((s) => s + 1)}>Neues Rauschen</button>
          </div>
          <span>
            f = eˣ: |Q(f̃) − Q(f)| = <b>{pow10(Math.abs(Qt - Q))}</b> ≤ Σ|wᵢ|·δ = <b>{pow10(sumW * delta)}</b>
          </span>
        </div>
      </div>
      <Takeaway label={MERKE}>
        tol zu groß → gemessen &gt; 2N − 1 (<Tex tex="\|p_N\|^2\sim4^{-N}" /> fällt unter tol). tol unter dem Rundungsniveau → gemessen &lt; 2N − 1.
        Dazwischen stimmt die Messung mit der Theorie.
      </Takeaway>
    </>
  );
}
