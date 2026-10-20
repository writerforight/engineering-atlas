import { useCallback, useMemo, useRef, useState } from 'react';
import {
  cdiv,
  dampedSineSignal,
  drawnSignal,
  integralTransform,
  lorentzian,
  rampSignal,
  rocG,
  simpson,
  stepSignal,
  type CausalSignal,
} from '../../core/math';
import {
  Callout,
  Canvas,
  Slider,
  Tex,
  drawGridAxes,
  fmt,
  makeViewport,
  polyline,
  type CanvasPointer,
  type DrawContext,
  type Viewport,
} from '../../core/ui';

type Kind = 'step' | 'ramp' | 'damped' | 'drawn';
const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'step', label: 'Basamak u(t)' },
  { id: 'ramp', label: 'Rampa t·u(t)' },
  { id: 'damped', label: 'Sönümlü sinüs' },
  { id: 'drawn', label: 'Kendin çiz' },
];

const T_VIEW = 10;
const DRAW_T = 8;
const DRAW_N = 80;
const DRAW_Y = 1.5;
const W_MAX = 5;

function initialDrawing(): number[] {
  return Array.from({ length: DRAW_N + 1 }, (_, k) => {
    const t = (k / DRAW_N) * DRAW_T;
    return t >= 0.5 && t < 2.5 ? 1 : t >= 3.5 && t < 4.5 ? -0.6 : 0;
  });
}

function sample(fn: (t: number) => number, t0: number, t1: number, n = 400): Array<[number, number]> {
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = t0 + ((t1 - t0) * k) / n;
    return [t, fn(t)];
  });
}

/** Symmetric-ish y range covering the samples, with a floor so flat lines stay readable. */
function yRange(pts: ReadonlyArray<readonly [number, number]>, floor = 1, cap = 1e3): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const [, y] of pts) {
    if (!Number.isFinite(y)) continue;
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  lo = Math.max(lo, -cap);
  hi = Math.min(hi, cap);
  if (hi - lo < floor) hi = lo + floor;
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

const PAD = { l: 38, r: 10, t: 10, b: 22 };

export default function Viz() {
  const [kind, setKind] = useState<Kind>('damped');
  const [sigma, setSigma] = useState(0.4);
  const [alpha, setAlpha] = useState(0.4);
  const [w0, setW0] = useState(2);
  const [ys, setYs] = useState(initialDrawing);
  const lastPoint = useRef<{ idx: number; y: number } | null>(null);

  const sig: CausalSignal = useMemo(() => {
    switch (kind) {
      case 'step':
        return stepSignal();
      case 'ramp':
        return rampSignal();
      case 'damped':
        return dampedSineSignal(alpha, w0);
      case 'drawn':
        return drawnSignal(ys, DRAW_T);
    }
  }, [kind, alpha, w0, ys]);

  const roc = rocG(sig);
  const inRoc = sigma > roc + 1e-9;
  const fPts = useMemo(() => sample(sig.f, 0, T_VIEW), [sig]);
  const gPts = useMemo(() => sample(sig.g, 0, T_VIEW), [sig]);
  const dPts = useMemo(() => sample((t) => sig.g(t) * Math.exp(-sigma * t), 0, T_VIEW), [sig, sigma]);

  // Area under g e^{-sigma t} over [0, inf) = G(sigma), numerically vs analytically.
  const area = useMemo(() => {
    if (!inRoc) return null;
    const horizon = Math.min(400, 40 / (sigma - roc));
    // Once g has settled, the tail beyond the horizon is g(inf) e^{-sigma H} / sigma.
    const tail = sig.gInfinity !== null && sigma > 0 ? (sig.gInfinity * Math.exp(-sigma * horizon)) / sigma : 0;
    const numeric = simpson((t) => sig.g(t) * Math.exp(-sigma * t), 0, horizon, 8000) + tail;
    const analytic = integralTransform(sig, [sigma, 0])[0];
    return { numeric, analytic };
  }, [sig, sigma, roc, inRoc]);

  const fRange: [number, number] = kind === 'drawn' ? [-DRAW_Y, DRAW_Y] : yRange(fPts);
  const gRange = yRange(gPts);

  const drawF = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(width, height, { x: [0, T_VIEW], y: fRange }, PAD);
      drawGridAxes(ctx, vp, pal, { ticks: 5, xLabel: 't', yLabel: 'f(t)' });
      if (kind === 'drawn') shadeSupport(ctx, vp, pal.grid);
      polyline(ctx, vp, fPts, pal.c1, 2.2);
    },
    [fPts, fRange, kind],
  );

  const drawG = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(width, height, { x: [0, T_VIEW], y: gRange }, PAD);
      drawGridAxes(ctx, vp, pal, { ticks: 5, xLabel: 't', yLabel: 'g(t) = ∫f' });
      if (sig.gInfinity !== null) {
        polyline(ctx, vp, [[0, sig.gInfinity], [T_VIEW, sig.gInfinity]], pal.axis, 1.2, [5, 4]);
      }
      polyline(ctx, vp, gPts, pal.c3, 2.2);
    },
    [gPts, gRange, sig],
  );

  const drawDamped = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(width, height, { x: [0, T_VIEW], y: yRange([...dPts, ...gPts.slice(0, 1)]) }, PAD);
      drawGridAxes(ctx, vp, pal, { ticks: 5, xLabel: 't', yLabel: 'g(t)·exp(−σt)' });
      // Shaded area = G(sigma) (only meaningful inside the ROC).
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = inRoc ? pal.c2 : pal.muted;
      ctx.beginPath();
      ctx.moveTo(vp.x(0), vp.y(0));
      for (const [t, y] of dPts) ctx.lineTo(vp.x(t), Math.max(-1e4, Math.min(1e4, vp.y(y))));
      ctx.lineTo(vp.x(T_VIEW), vp.y(0));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      polyline(ctx, vp, gPts, pal.grid, 1.5);
      polyline(ctx, vp, dPts, pal.c2, 2.2);
    },
    [dPts, gPts, inRoc],
  );

  const onDraw = useCallback(
    (p: CanvasPointer) => {
      if (kind !== 'drawn') return;
      if (p.type === 'up') {
        lastPoint.current = null;
        return;
      }
      if (p.type === 'move' && !p.buttons) return;
      const vp = makeViewport(p.width, p.height, { x: [0, T_VIEW], y: [-DRAW_Y, DRAW_Y] }, PAD);
      const t = vp.x.invert(p.x);
      const y = Math.max(-DRAW_Y, Math.min(DRAW_Y, vp.y.invert(p.y)));
      const idx = Math.round((t / DRAW_T) * DRAW_N);
      if (idx < 0 || idx > DRAW_N) return;
      // Read the previous sample now: the state updater below runs later.
      const from = lastPoint.current ?? { idx, y };
      lastPoint.current = { idx, y };
      setYs((prev) => {
        const next = prev.slice();
        const [a, b] = from.idx <= idx ? [from.idx, idx] : [idx, from.idx];
        // Interpolate across the gap since the previous pointer sample so fast strokes stay continuous.
        for (let k = a; k <= b; k++) {
          const u = b === a ? 1 : (k - from.idx) / (idx - from.idx);
          next[k] = from.y + (y - from.y) * u;
        }
        return next;
      });
    },
    [kind],
  );

  return (
    <div className="controls">
      <div className="row">
        {KINDS.map((k) => (
          <button key={k.id} className="btn" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      {kind === 'damped' && (
        <div className="viz-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Slider label={<Tex tex="\alpha" />} value={alpha} min={0} max={1.5} onChange={setAlpha} />
          <Slider label={<Tex tex="\omega_0" />} value={w0} min={0.5} max={5} onChange={setW0} />
        </div>
      )}
      <div className="viz-grid-3">
        <div className="panel">
          <Canvas draw={drawF} aspect={0.7} onPointer={kind === 'drawn' ? onDraw : undefined} ariaLabel="f(t) grafiği" />
          <p className="canvas-caption">
            <Tex tex={signalTex(kind, alpha, w0)} />
            {kind === 'drawn' && ' · Fareyle/parmakla çiz (0 ≤ t ≤ 8), sonrası 0.'}
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawG} aspect={0.7} ariaLabel="g(t), f'nin integrali" />
          <p className="canvas-caption">
            <Tex tex="g(t)=\int_0^t f" />
            {sig.gInfinity !== null ? (
              <>
                {' '}· kesikli çizgi <Tex tex={`g(\\infty)=F(0)=${fmt(sig.gInfinity)}`} />
              </>
            ) : (
              <> · sınırsız ya da yakınsamıyor</>
            )}
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawDamped} aspect={0.7} ariaLabel="Sönümlenmiş g(t)e^{-σt}" />
          <p className="canvas-caption">
            Taralı alan <Tex tex="=G(\sigma)=\int_0^\infty g\,e^{-\sigma t}dt" />
          </p>
        </div>
      </div>
      <div className="viz-grid">
        <SpectrumPanel sig={sig} sigma={sigma} inRoc={inRoc} />
        <div className="panel controls">
          <Slider label={<Tex tex="\sigma" />} value={sigma} min={-0.6} max={2} step={0.005} onChange={setSigma} />
          {inRoc && area ? (
            <div className="readout">
              <Tex tex={`\\int_0^\\infty g\\,e^{-\\sigma t}dt \\approx ${fmt(area.numeric, 5)}`} />
              <Tex tex={`F(\\sigma)/\\sigma = ${fmt(area.analytic, 5)}`} />
              <span className={Math.abs(area.numeric - area.analytic) < 1e-4 * Math.max(1, Math.abs(area.analytic)) ? 'ok' : 'bad'}>
                fark {Math.abs(area.numeric - area.analytic).toExponential(1)}
              </span>
            </div>
          ) : (
            <Callout kind="warn" title="ROC dışındasın">
              <Tex tex={`\\sigma=${fmt(sigma, 2)}\\le ${fmt(roc, 2)}`} />: <Tex tex="g(t)e^{-\sigma t}" /> sönmüyor
              ve integral ıraksıyor. <Tex tex="F(s)/s" /> formülü burada bir dönüşüm değeri değildir, sadece
              analitik devamdır. ROC: <Tex tex={`\\operatorname{Re}s>${fmt(roc, 2)}`} />.
            </Callout>
          )}
          {inRoc && sigma < 0.15 && sig.gInfinity !== null && (
            <Callout title="σ → 0 limitine yaklaşıyorsun">
              <Tex tex="\operatorname{Re}G" />’deki tepe <Tex tex={`\\pi F(0)=${fmt(Math.PI * sig.gInfinity)}`} />{' '}
              alanını koruyarak daralıyor: limitte <Tex tex="\pi F(0)\delta(\omega)" />. Sanal kısım{' '}
              <Tex tex="-F(0)/\omega" />’ya yapışıyor: <Tex tex="F(j\omega)/(j\omega)" />.
            </Callout>
          )}
          {sig.gInfinity === null && (
            <Callout kind="warn" title="Fourier ekseni ROC’un sınırında değil, dışında kalıyor">
              Bu sinyal için <Tex tex="g" /> sınırlı bir değere yerleşmiyor, <Tex tex="F(0)" /> tanımsız.{' '}
              <Tex tex="\sigma\to0" /> limiti sıradan bir fonksiyon vermez.
            </Callout>
          )}
        </div>
      </div>
      <Callout title="Nedensel sinyal mi, nedensel sistem mi?">
        <b>Nedensel sinyal</b> bir fonksiyonun özelliğidir: <Tex tex="t<0" /> için <Tex tex="f(t)=0" />. Tek
        taraflı Laplace dönüşümü bunlar için kurulmuştur ve ROC’ları her zaman bir <b>sağ</b> yarı-düzlemdir.{' '}
        <b>Nedensel sistem</b> ise bir operatörün özelliğidir: <Tex tex="y(t)" /> yalnızca{' '}
        <Tex tex="\tau\le t" /> anlarındaki girişe bağlıdır. LTI bir sistem için bu, dürtü yanıtı{' '}
        <Tex tex="h(t)" />’nin nedensel bir sinyal olması demektir. İntegratör nedensel bir sistemdir (
        <Tex tex="h=u" />, <Tex tex="H=1/s" />) ama kararlı değildir: kutbu tam <Tex tex="s=0" />’da, yani ROC
        sınırındadır.
      </Callout>
    </div>
  );
}

function shadeSupport(ctx: CanvasRenderingContext2D, vp: Viewport, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(vp.x(DRAW_T), vp.top, vp.right - vp.x(DRAW_T), vp.bottom - vp.top);
  ctx.restore();
}

function signalTex(kind: Kind, alpha: number, w0: number): string {
  switch (kind) {
    case 'step':
      return 'f=u(t),\\ F=1/s';
    case 'ramp':
      return 'f=t\\,u(t),\\ F=1/s^2';
    case 'damped':
      return `f=e^{-${fmt(alpha, 2)}t}\\sin(${fmt(w0, 2)}t),\\ F=\\frac{\\omega_0}{(s+\\alpha)^2+\\omega_0^2}`;
    case 'drawn':
      return 'f=\\text{çizim}';
  }
}

/** Re/Im of G(sigma + j w) against w, with the sigma -> 0 limit shapes overlaid. */
function SpectrumPanel({ sig, sigma, inRoc }: { sig: CausalSignal; sigma: number; inRoc: boolean }) {
  const data = useMemo(() => {
    const n = 500;
    const re: Array<[number, number]> = [];
    const im: Array<[number, number]> = [];
    const lor: Array<[number, number]> = [];
    const inv: Array<[number, number]> = [];
    const F0 = sig.gInfinity;
    for (let k = 0; k <= n; k++) {
      const w = -W_MAX + (2 * W_MAX * k) / n;
      const G = integralTransform(sig, [sigma, w]);
      re.push([w, G[0]]);
      im.push([w, G[1]]);
      if (F0 !== null) {
        lor.push([w, F0 * lorentzian(sigma, w)]);
        // F(jw)/(jw): imaginary part of the sigma = 0 principal-value term.
        const lim = Math.abs(w) > 1e-3 ? cdiv(sig.F([0, w]), [0, w]) : [NaN, NaN];
        inv.push([w, lim[1]!]);
      }
    }
    return { re, im, lor, inv };
  }, [sig, sigma]);

  const yr = useMemo(() => {
    const ys = [...data.re, ...data.im].filter(([w]) => Math.abs(w) > 0.05);
    const [lo, hi] = yRange(ys, 1, 60);
    const peak = Math.min(60, Math.max(...data.re.map(([, y]) => (Number.isFinite(y) ? Math.abs(y) : 0))));
    return [Math.min(lo, -0.2 * peak), Math.max(hi, peak * 1.05)] as [number, number];
  }, [data]);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(width, height, { x: [-W_MAX, W_MAX], y: yr }, PAD);
      drawGridAxes(ctx, vp, pal, { ticks: 8, xLabel: 'ω', yLabel: 'G(σ + jω)' });
      if (data.lor.length) {
        polyline(ctx, vp, data.lor, pal.c4, 1.5, [6, 4]);
        polyline(ctx, vp, data.inv, pal.axis, 1.5, [6, 4]);
      }
      polyline(ctx, vp, data.re, pal.c1, 2.2);
      polyline(ctx, vp, data.im, pal.c2, 2.2);
    },
    [data, yr],
  );

  return (
    <div className="panel" style={{ opacity: inRoc ? 1 : 0.55 }}>
      <Canvas draw={draw} aspect={0.55} ariaLabel="G(σ+jω) gerçel ve sanal kısmı" />
      <div className="legend" style={{ marginTop: 8 }}>
        <span>
          <i style={{ background: 'var(--c1)' }} />
          <Tex tex="\operatorname{Re}G" />
        </span>
        <span>
          <i style={{ background: 'var(--c2)' }} />
          <Tex tex="\operatorname{Im}G" />
        </span>
        {data.lor.length > 0 && (
          <>
            <span>
              <i style={{ background: 'var(--c4)' }} />
              <Tex tex="F(0)\,\frac{\sigma}{\sigma^2+\omega^2}\to\pi F(0)\delta(\omega)" />
            </span>
            <span>
              <i style={{ background: 'var(--axis)' }} />
              <Tex tex="\operatorname{Im}\frac{F(j\omega)}{j\omega}" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
