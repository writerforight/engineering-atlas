import { useCallback, useMemo, useState } from 'react';
import { cellWidths, gaussLegendre, momentWeights, simpson, transformRule } from '../../core/math';
import {
  Canvas, KeyIdentity, Slider, Takeaway, Tex, dot, drawGridAxes, fmt, label, makeViewport, plotFn, polyline,
  type DrawContext, type Viewport,
} from '../../core/ui';
import { Choice, CurveToggle, MERKE, clip, pow10, toggle, yRange } from './shared';

const FUNCS = [
  { id: 'exp', label: 'eˣ', f: Math.exp },
  { id: 'sin', label: 'sin 3x + 1,5', f: (x: number) => Math.sin(3 * x) + 1.5 },
  { id: 'poly', label: 'x⁶ − x² + 1', f: (x: number) => x ** 6 - x * x + 1 },
  { id: 'runge', label: '1/(1+25x²)', f: (x: number) => 1 / (1 + 25 * x * x) },
  { id: 'abs', label: '|x|', f: Math.abs },
] as const;
type FId = (typeof FUNCS)[number]['id'];
type Layer = 'area' | 'riemann' | 'gauss' | 'moment';
type Method = 'riemann' | 'gauss' | 'moment';
const METHODS: ReadonlyArray<{ id: Method; name: string; col: 'c2' | 'c1' | 'c4' }> = [
  { id: 'riemann', name: 'Riemann: Zellbreiten um die Legendre-Punkte', col: 'c2' },
  { id: 'gauss', name: 'Gauß-Gewichte aus J', col: 'c1' },
  { id: 'moment', name: 'Momentensystem (mein Vorschlag)', col: 'c4' },
];

/** Contiguous rectangles: width w_i, height f(x_i), laid side by side from a. */
function rects(ctx: CanvasRenderingContext2D, vp: Viewport, a: number, w: readonly number[], h: readonly number[], col: string) {
  let left = a;
  w.forEach((wi, i) => {
    const x0 = vp.x(left), x1 = vp.x(left + wi), y0 = vp.y(0), y1 = vp.y(h[i]!);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = col;
    ctx.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
    left += wi;
  });
}

export function Ch7Quadrature() {
  const [fid, setFid] = useState<FId>('exp');
  const [N, setN] = useState(3);
  const [a, setA] = useState(0);
  const [b, setB] = useState(2);
  const [layers, setLayers] = useState<Set<Layer>>(new Set(['area', 'gauss']));
  const f = FUNCS.find((t) => t.id === fid)!.f;
  const m = (a + b) / 2, h = (b - a) / 2;

  const ref = useMemo(() => gaussLegendre(N), [N]);
  const rule = useMemo(() => transformRule(ref, a, b), [ref, a, b]);
  const W: Record<Method, number[]> = useMemo(() => ({
    riemann: cellWidths(rule.x, a, b),
    gauss: rule.w,
    moment: momentWeights(ref.x).map((w) => h * w),
  }), [rule, ref, a, b, h]);
  const fx = rule.x.map(f);
  const I = useMemo(() => (fid === 'abs' && a < 0 && b > 0 ? (a * a + b * b) / 2 : fid === 'abs' ? Math.abs((b * Math.abs(b) - a * Math.abs(a)) / 2) : simpson(f, a, b, 4000)), [f, fid, a, b]);
  const Q = (w: number[]) => w.reduce((s, wi, i) => s + wi * fx[i]!, 0);
  const sum = (w: number[]) => w.reduce((s, v) => s + v, 0);
  const inCell = (() => {
    let left = a;
    return rule.w.every((w, i) => {
      const ok = rule.x[i]! >= left && rule.x[i]! <= left + w;
      left += w;
      return ok;
    });
  })();

  const drawMain = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const span = b - a;
    const [lo, hi] = yRange([f], a, b, 0.12);
    const vp = makeViewport(width, height, { x: [a - 0.04 * span, b + 0.04 * span], y: [Math.min(0, lo), Math.max(0, hi)] }, { l: 44, r: 10, t: 12, b: 24 });
    drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'x' });
    clip(ctx, vp, () => {
      if (layers.has('area')) {
        ctx.beginPath();
        ctx.moveTo(vp.x(a), vp.y(0));
        for (let i = 0; i <= 400; i++) {
          const x = a + (span * i) / 400;
          ctx.lineTo(vp.x(x), vp.y(f(x)));
        }
        ctx.lineTo(vp.x(b), vp.y(0));
        ctx.closePath();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = pal.c3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (const meth of METHODS) if (layers.has(meth.id)) rects(ctx, vp, a, W[meth.id], fx, pal[meth.col]);
      plotFn(ctx, vp, f, pal.fg, 2.5, 600);
      rule.x.forEach((xi, i) => {
        polyline(ctx, vp, [[xi, 0], [xi, fx[i]!]], pal.fg, 1, [3, 3]);
        dot(ctx, vp, [xi, fx[i]!], pal.fg, 4.5);
      });
    });
  }, [a, b, f, fx, rule, W, layers]);

  const drawMap = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lo = Math.min(-1, a) - 0.2, hi = Math.max(1, b) + 0.2;
    const vp = makeViewport(width, height, { x: [lo, hi], y: [-1, 1] }, { l: 16, r: 16, t: 14, b: 14 });
    const yT = 0.55, yB = -0.55;
    polyline(ctx, vp, [[-1, yT], [1, yT]], pal.axis, 3);
    polyline(ctx, vp, [[a, yB], [b, yB]], pal.c1, 3);
    label(ctx, vp, [-1, yT], '−1', pal.muted, -8, -8);
    label(ctx, vp, [1, yT], '1', pal.muted, -4, -8);
    label(ctx, vp, [a, yB], `a = ${fmt(a, 2)}`, pal.c1, -20, 22);
    label(ctx, vp, [b, yB], `b = ${fmt(b, 2)}`, pal.c1, -20, 22);
    dot(ctx, vp, [0, yT], pal.muted, 3);
    dot(ctx, vp, [m, yB], pal.c2, 5);
    label(ctx, vp, [m, yB], 'm', pal.c2, 4, 18);
    ref.x.forEach((xh, i) => {
      polyline(ctx, vp, [[xh, yT], [rule.x[i]!, yB]], pal.grid, 1.2);
      dot(ctx, vp, [xh, yT], pal.fg, 4);
      dot(ctx, vp, [rule.x[i]!, yB], pal.fg, 4);
    });
    label(ctx, vp, [lo, yT], 'x̂', pal.muted, 2, -4);
    label(ctx, vp, [lo, yB], 'x', pal.muted, 2, -4);
  }, [a, b, m, ref, rule]);

  return (
    <>
      <KeyIdentity label="Quadraturformel">
        <Tex block tex="\int_a^b f(x)\,dx\;\approx\;Q=\sum_{i=1}^{N} w_i\,f(x_i)" />
      </KeyIdentity>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawMap} aspect={0.28} maxHeight={150} ariaLabel="Transformation von [-1,1] nach [a,b]" />
          <div className="readout">
            <Tex block tex="m=\tfrac{a+b}{2}\ (\text{Mitte}),\qquad h=\tfrac{b-a}{2}\ (\text{halbe Länge})" />
            <Tex block tex="x_i=m+h\,\hat x_i,\qquad dx=h\,d\hat x\;\Rightarrow\; w_i=h\,\hat w_i" />
          </div>
        </div>
        <div className="panel readout">
          <b>Summe der Gewichte</b>
          <Tex block tex="\sum_i w_i = Q(1)=\int_a^b 1\,dx = b-a" />
          <span>Alle drei Methoden integrieren Konstanten exakt, also füllen die Rechtecke immer genau [a, b].</span>
          <span>
            Liegt jedes xᵢ in seinem Gauß-Rechteck? <b className={inCell ? 'ok' : 'bad'}>{inCell ? 'ja' : 'nein'}</b>
          </span>
        </div>
      </div>
      <div className="panel">
        <Canvas draw={drawMain} aspect={0.5} maxHeight={420} ariaLabel="Quadratur-Rechtecke" />
        <div className="row" style={{ marginTop: 6 }}>
          <CurveToggle on={layers.has('area')} onClick={() => setLayers(toggle(layers, 'area'))} color="var(--c3)">Fläche ∫f</CurveToggle>
          {METHODS.map((mm) => (
            <CurveToggle key={mm.id} on={layers.has(mm.id)} onClick={() => setLayers(toggle(layers, mm.id))} color={`var(--${mm.col})`}>
              {mm.name}
            </CurveToggle>
          ))}
        </div>
        <p className="canvas-caption">Rechteck i: Breite = Gewicht wᵢ, Höhe = f(xᵢ), lückenlos nebeneinander ab a.</p>
        <div className="viz-grid" style={{ marginTop: 8 }}>
          <div className="controls">
            <Choice value={fid} onChange={setFid} items={FUNCS.map((t) => ({ id: t.id, label: t.label }))} />
            <Slider label="Anzahl Stützstellen N" value={N} min={1} max={12} step={1} onChange={setN} format={(t) => String(t)} />
            <Slider label="a" value={a} min={-3} max={2.5} step={0.05} onChange={(t) => { setA(t); if (b < t + 0.5) setB(t + 0.5); }} format={(t) => t.toFixed(2)} />
            <Slider label="b" value={b} min={-2.5} max={3} step={0.05} onChange={(t) => { setB(t); if (a > t - 0.5) setA(t - 0.5); }} format={(t) => t.toFixed(2)} />
          </div>
          <div className="scroll-x">
            <table className="num-table">
              <thead><tr><th style={{ textAlign: 'left' }}>Methode</th><th>Σ wᵢ</th><th>Q</th><th>|Q − I|</th></tr></thead>
              <tbody>
                <tr><td style={{ textAlign: 'left', color: 'var(--c3)' }}>exakt I</td><td>{fmt(b - a, 4)}</td><td>{I.toFixed(10)}</td><td /></tr>
                {METHODS.map((mm) => (
                  <tr key={mm.id}>
                    <td style={{ textAlign: 'left', color: `var(--${mm.col})` }}>{mm.id === 'riemann' ? 'Riemann' : mm.id === 'gauss' ? 'Gauß' : 'Momente'}</td>
                    <td>{fmt(sum(W[mm.id]), 4)}</td>
                    <td>{Q(W[mm.id]).toFixed(10)}</td>
                    <td>{pow10(Math.abs(Q(W[mm.id]) - I))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="num-table" style={{ marginTop: 10 }}>
              <thead><tr><th>i</th><th>xᵢ</th><th>f(xᵢ)</th><th>Riemann</th><th>Gauß</th><th>Momente</th></tr></thead>
              <tbody>
                {rule.x.map((xi, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td><td>{fmt(xi, 4)}</td><td>{fmt(fx[i]!, 4)}</td>
                    <td>{fmt(W.riemann[i]!, 4)}</td><td>{fmt(W.gauss[i]!, 4)}</td><td>{fmt(W.moment[i]!, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <KeyIdentity label="Mein Vorschlag: Momentensystem">
        <Tex block tex="\sum_{i=1}^{N} \hat w_i\,\hat x_i^{\,k}=\int_{-1}^{1}x^k\,dx\quad(k=0,\dots,N-1)\;\Longleftrightarrow\;A\hat w=\mu,\quad A_{ki}=\hat x_i^{\,k}" />
      </KeyIdentity>
      <Takeaway label={MERKE}>
        Gleiche Gewichte wie aus <Tex tex="J" /> (Tabelle). Offener Punkt: warum <Tex tex="\hat w_i=2\,(v_i)_1^2" /> (erste
        Eigenvektorkomponente) — Herleitung über die Christoffel-Formel.
      </Takeaway>
    </>
  );
}
