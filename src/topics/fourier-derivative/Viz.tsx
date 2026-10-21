import { useCallback, useMemo, useState } from 'react';
import {
  backwardDifference,
  backwardGain,
  checkDerivative,
  checkIntegral,
  energeticBins,
  fft,
  gaussPulse,
  magnitude,
  seriesMaxAbs,
  seriesMaxDiff,
  omegaGrid,
  phaseDifference,
  removeMean,
  spectralDerivative,
  spectralIntegral,
  twoSines,
  whiteNoise,
} from '../../core/math';
import {
  Callout,
  Canvas,
  Slider,
  Tabs,
  Tex,
  dot,
  drawGridAxes,
  fmt,
  fmtErr,
  makeViewport,
  polyline,
  useHashParam,
  type DrawContext,
  type Viewport,
} from '../../core/ui';

type Kind = 'sines' | 'gauss' | 'noisy';
type TabId = 'derivative' | 'integral';
const TAB_IDS: readonly TabId[] = ['derivative', 'integral'];
const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'sines', label: 'İki sinüs' },
  { id: 'gauss', label: 'Gauss darbesi' },
  { id: 'noisy', label: 'İki sinüs + gürültü' },
];

const PAD = { l: 44, r: 10, t: 10, b: 22 };
/** Bins below this fraction of max|F| are left out of ratio and phase plots (see energeticBins). */
const REL_THRESHOLD = 1e-6;
/** Fraction of a cycle added to both sines when the leakage toggle is on. */
const LEAK = 0.4;
/** Log plots: values below this are drawn at the floor. */
const LOG_FLOOR = -17;

type Pts = Array<[number, number]>;

/** Bin indices ordered by ω (negative frequencies first), Nyquist excluded. */
function byOmega(N: number): number[] {
  const out: number[] = [];
  for (let k = N / 2 + 1; k < N; k++) out.push(k);
  for (let k = 0; k < N / 2; k++) out.push(k);
  return out;
}

const log10c = (v: number) => (v > 0 ? Math.max(LOG_FLOOR, Math.log10(v)) : LOG_FLOOR);

function logSpectrum(order: number[], w: Float64Array, value: (k: number) => number): Pts {
  return order.map((k) => [w[k]!, log10c(value(k))]);
}

function range(pts: ReadonlyArray<Pts>, floor = 1): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pts) for (const [, y] of p) if (Number.isFinite(y)) [lo, hi] = [Math.min(lo, y), Math.max(hi, y)];
  if (!Number.isFinite(lo)) return [-1, 1];
  if (hi - lo < floor) hi = lo + floor;
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

function dots(ctx: CanvasRenderingContext2D, vp: Viewport, pts: Pts, color: string, r = 2.6) {
  for (const p of pts) if (Number.isFinite(p[1])) dot(ctx, vp, p, color, r);
}

export default function Viz() {
  const [tab, setTab] = useHashParam<TabId>('tab', 'derivative', TAB_IDS);
  const [kind, setKind] = useState<Kind>('sines');
  const [log2N, setLog2N] = useState(8);
  const [Ts, setTs] = useState(0.01);
  const [c1, setC1] = useState(3);
  const [c2, setC2] = useState(17);
  const [width, setWidth] = useState(0.05);
  const [noise, setNoise] = useState(0.02);
  const [leak, setLeak] = useState(false);

  const N = 2 ** log2N;
  const maxCycles = N / 2 - 1;
  const cyc1 = Math.min(c1, maxCycles) + (leak ? LEAK : 0);
  const cyc2 = Math.min(c2, maxCycles) + (leak ? LEAK : 0);
  const usesSines = kind !== 'gauss';

  const sig = useMemo(() => {
    if (kind === 'gauss') return gaussPulse(N, Ts, width);
    const s = twoSines(N, Ts, cyc1, cyc2);
    if (kind === 'noisy') {
      const e = whiteNoise(N, noise);
      return { ...s, x: s.x.map((v, n) => v + e[n]!) };
    }
    return s;
  }, [kind, N, Ts, width, cyc1, cyc2, noise]);

  const t = useMemo(() => Array.from({ length: N }, (_, n) => n * Ts), [N, Ts]);
  const w = useMemo(() => omegaGrid(N, Ts), [N, Ts]);
  const order = useMemo(() => byOmega(N), [N]);
  const wN = Math.PI / Ts;

  return (
    <div>
      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'derivative', label: "Türev: F{f′} = iω F" },
          { id: 'integral', label: 'İntegral: F{∫f} = F/(iω)' },
        ]}
      />
      <div className="controls" style={{ marginBottom: 12 }}>
        <div className="row">
          {KINDS.map((k) => (
            <button key={k.id} className="btn" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
          {usesSines && (
            <button className="btn" aria-pressed={leak} onClick={() => setLeak((v) => !v)}>
              Sızıntı: kesirli periyot {leak ? 'açık' : 'kapalı'}
            </button>
          )}
        </div>
        <div className="viz-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <Slider label={<Tex tex="N" />} value={log2N} min={6} max={11} step={1} onChange={setLog2N} format={(v) => String(2 ** v)} />
          <Slider label={<Tex tex="T_s" />} value={Ts} min={0.001} max={0.05} step={0.001} onChange={setTs} format={(v) => `${fmt(v * 1000, 0)} ms`} />
          {usesSines ? (
            <>
              <Slider label="1. sinüs: periyot sayısı" value={c1} min={1} max={10} step={1} onChange={setC1} format={(v) => `${fmt(cyc1 === v ? v : cyc1, 1)} · ${fmt(cyc1 / (N * Ts), 2)} Hz`} />
              <Slider label="2. sinüs: periyot sayısı" value={c2} min={2} max={Math.min(120, maxCycles)} step={1} onChange={setC2} format={() => `${fmt(cyc2, 1)} · ${fmt(cyc2 / (N * Ts), 2)} Hz`} />
            </>
          ) : (
            <Slider label={<Tex tex="\sigma / T" />} value={width} min={0.02} max={0.3} step={0.005} onChange={setWidth} format={(v) => fmt(v, 3)} />
          )}
          {kind === 'noisy' && <Slider label="Gürültü σ" value={noise} min={0} max={0.2} step={0.002} onChange={setNoise} format={(v) => fmt(v, 3)} />}
        </div>
        <p className="canvas-caption">
          Pencere <Tex tex={`T=N T_s=${fmt(N * Ts, 3)}\\,\\text{s}`} />, Nyquist{' '}
          <Tex tex={`\\omega_N=\\pi/T_s=${fmt(wN, 1)}\\,\\text{rad/s}`} />.{usesSines && ' 1. sinüsün genliği 1, 2.’nin 0.3.'}
        </p>
      </div>
      {tab === 'derivative' ? (
        <DerivativeView kind={kind} sig={sig} t={t} w={w} order={order} Ts={Ts} wN={wN} leak={leak && usesSines} />
      ) : (
        <IntegralView kind={kind} sig={sig} t={t} w={w} order={order} Ts={Ts} wN={wN} leak={leak && usesSines} />
      )}
    </div>
  );
}

interface ViewProps {
  kind: Kind;
  sig: { x: Float64Array; dx: Float64Array | null; ix: Float64Array | null };
  t: number[];
  w: Float64Array;
  order: number[];
  Ts: number;
  wN: number;
  leak: boolean;
}

type Source = 'analytic' | 'spectral' | 'fd';
const SOURCES: Array<{ id: Source; label: string }> = [
  { id: 'analytic', label: 'analitik f′ örnekleri' },
  { id: 'spectral', label: 'spektral iωX' },
  { id: 'fd', label: 'sonlu fark' },
];

function DerivativeView({ kind, sig, t, w, order, Ts, wN, leak }: ViewProps) {
  const [picked, setPicked] = useState<Source>('analytic');
  // The noisy signal has no closed-form derivative (the noise has none), so fall back to the spectral one.
  const source: Source = picked === 'analytic' && !sig.dx ? 'spectral' : picked;
  const d = useMemo(() => {
    const { dx, X } = spectralDerivative(sig.x, Ts);
    const fd = backwardDifference(sig.x, Ts);
    // F′ for plots B–D. The analytic derivative is the independent test of F{f′} = iωF: the spectral
    // derivative IS iωX by construction, so with it B–D only show round-off.
    const dSrc = source === 'analytic' ? sig.dx! : source === 'fd' ? fd : dx;
    const D = fft(dSrc);
    const FD = fft(fd);
    const bins = energeticBins(X, REL_THRESHOLD);
    return {
      dx,
      fd,
      X,
      D,
      FD,
      bins,
      check: checkDerivative(sig.x, dSrc, Ts, REL_THRESHOLD),
      errSpec: sig.dx ? seriesMaxDiff(dx, sig.dx) / seriesMaxAbs(sig.dx) : null,
      errFd: sig.dx ? seriesMaxDiff(fd, sig.dx) / seriesMaxAbs(sig.dx) : null,
    };
  }, [sig, Ts, source]);

  const T = t.length * Ts;
  const xPts: Pts = t.map((tt, n) => [tt, sig.x[n]!]);
  const specPts: Pts = t.map((tt, n) => [tt, d.dx[n]!]);
  // The backward difference estimates f′ at the midpoint t − Ts/2; plotted at t_n as computed.
  const fdPts: Pts = t.map((tt, n) => [tt, d.fd[n]!]);
  const exactPts: Pts | null = sig.dx ? t.map((tt, n) => [tt, sig.dx![n]!]) : null;

  const magF = logSpectrum(order, w, (k) => magnitude(d.X, k));
  const magD = logSpectrum(order, w, (k) => magnitude(d.D, k));
  const wF = logSpectrum(order, w, (k) => Math.abs(w[k]!) * magnitude(d.X, k));
  const ratio: Pts = d.bins.map((k) => [w[k]!, magnitude(d.D, k) / magnitude(d.X, k)]);
  const phase: Pts = d.bins.map((k) => [w[k]!, phaseDifference(d.X, d.D, k)]);
  const fdRatio: Pts = d.bins.map((k) => [w[k]!, magnitude(d.FD, k) / magnitude(d.X, k)]);
  const edge = Math.max(Math.abs(sig.x[0]!), Math.abs(sig.x[sig.x.length - 1]!)) / seriesMaxAbs(sig.x);

  const drawX = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [0, T], y: range([xPts]) }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't', yLabel: 'f(t)' });
      polyline(ctx, vp, xPts, pal.fg, 1.8);
    },
    [xPts, T],
  );

  const drawD = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [0, T], y: range([exactPts ?? specPts, specPts]) }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't', yLabel: "f′(t)" });
      polyline(ctx, vp, fdPts, pal.c2, 1.6);
      polyline(ctx, vp, specPts, pal.c1, 2.2);
      if (exactPts) polyline(ctx, vp, exactPts, pal.c3, 1.6, [6, 4]);
    },
    [fdPts, specPts, exactPts, T],
  );

  const drawMag = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: range([magF, magD, wF]) }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: 'log₁₀ |·|' });
      polyline(ctx, vp, magF, pal.muted, 1.3);
      polyline(ctx, vp, magD, pal.c1, 2.4);
      polyline(ctx, vp, wF, pal.c4, 1.4, [5, 4]);
    },
    [magF, magD, wF, wN],
  );

  const drawRatio = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: [0, wN * 1.05] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: '|F′| / |F|' });
      polyline(ctx, vp, [[-wN, wN], [0, 0], [wN, wN]], pal.c4, 1.4);
      dots(ctx, vp, ratio, pal.c1);
    },
    [ratio, wN],
  );

  const drawPhase = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: [-Math.PI, Math.PI] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: 'arg F′ − arg F' });
      polyline(ctx, vp, [[-wN, -Math.PI / 2], [0, -Math.PI / 2]], pal.c4, 1.4, [5, 4]);
      polyline(ctx, vp, [[0, Math.PI / 2], [wN, Math.PI / 2]], pal.c4, 1.4, [5, 4]);
      dots(ctx, vp, phase, pal.c1);
    },
    [phase, wN],
  );

  const drawFd = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: [0, wN * 1.05] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: 'kazanç' });
      polyline(ctx, vp, [[-wN, wN], [0, 0], [wN, wN]], pal.c4, 1.4);
      const gain: Pts = Array.from({ length: 401 }, (_, i) => {
        const om = -wN + (2 * wN * i) / 400;
        return [om, backwardGain(om, Ts)];
      });
      polyline(ctx, vp, gain, pal.c2, 2);
      dots(ctx, vp, fdRatio, pal.c2, 2.4);
    },
    [fdRatio, wN, Ts],
  );

  const ok = (v: number, lim: number) => <span className={v < lim ? 'ok' : 'bad'}>{fmtErr(v)}</span>;

  return (
    <div className="controls">
      <div className="controls">
        <div className="panel">
          <Canvas draw={drawX} aspect={0.22} maxHeight={220} ariaLabel="f(t)" />
          <p className="canvas-caption">A · sinyal f(t){kind === 'gauss' ? <> · kenar değeri {fmtErr(edge)}</> : null}</p>
        </div>
        <div className="panel">
          <Canvas draw={drawD} aspect={0.3} maxHeight={320} ariaLabel="f′(t), üç yöntem" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--c1)' }} />spektral iωF</span>
            <span><i style={{ background: 'var(--c2)' }} />sonlu fark</span>
            {sig.dx && <span><i style={{ background: 'var(--c3)' }} />analitik{kind === 'noisy' ? ' (gürültüsüz)' : ''}</span>}
          </div>
        </div>
      </div>

      <div className="row">
        <span className="canvas-caption" style={{ margin: 0 }}>B–D’deki F′ =</span>
        {SOURCES.map((s) => (
          <button
            key={s.id}
            className="btn"
            aria-pressed={source === s.id}
            disabled={s.id === 'analytic' && !sig.dx}
            onClick={() => setPicked(s.id)}
          >
            FFT({s.label})
          </button>
        ))}
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawMag} aspect={0.55} ariaLabel="Genlik spektrumları" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--muted)' }} />|F|</span>
            <span><i style={{ background: 'var(--c1)' }} />|F′|</span>
            <span><i style={{ background: 'var(--c4)' }} />|ω|·|F| (kesikli)</span>
          </div>
          <p className="canvas-caption">
            B · son ikisi üst üste binmeli; aradaki fark hatadır.
            {source === 'spectral' && ' Spektral türev tanım gereği iωX olduğundan burada fark yalnız yuvarlama hatasıdır.'}
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawRatio} aspect={0.55} ariaLabel="Genlik oranı" />
          <p className="canvas-caption">
            C · noktalar <Tex tex="|F'|/|F|" />, çizgi <Tex tex="|\omega|" /> (yalnız <Tex tex="|F|>10^{-6}\max|F|" /> olan binler)
          </p>
        </div>
      </div>

      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawPhase} aspect={0.55} ariaLabel="Faz farkı" />
          <p className="canvas-caption">
            D · <Tex tex="\omega>0" /> için <Tex tex="+\pi/2" />, <Tex tex="\omega<0" /> için <Tex tex="-\pi/2" /> (aynı eşik)
          </p>
        </div>
        <div className="panel">
          <Canvas draw={drawFd} aspect={0.55} ariaLabel="Sonlu fark kazancı" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--c4)' }} />|ω|</span>
            <span><i style={{ background: 'var(--c2)' }} />(2/Tₛ)|sin(ωTₛ/2)| ve ölçülen |F_fd|/|F|</span>
          </div>
          <p className="canvas-caption">E · sonlu fark Nyquist’e doğru düzleşir: yüksek frekansları eksik türevler.</p>
        </div>
      </div>

      <div className="panel readout">
        <span>
          F′ = FFT({SOURCES.find((s) => s.id === source)!.label}):{' '}
          <Tex tex="\max\big||F'|-|\omega||F|\big|/\max|\omega||F|" /> = {ok(d.check.magRelErr, 1e-10)} (ölçüt {'<'} 1e-10)
        </span>
        <span>
          <Tex tex="\max\big|\Delta\arg-\operatorname{sgn}(\omega)\tfrac{\pi}{2}\big|" /> = {ok(d.check.phaseErr, 1e-8)} (ölçüt {'<'} 1e-8, {d.bins.length} bin)
        </span>
        {d.errSpec !== null && d.errFd !== null && (
          <span>
            Zamanda göreli hata, analitiğe göre: spektral {fmtErr(d.errSpec)} · sonlu fark {fmtErr(d.errFd)}
          </span>
        )}
      </div>

      {leak && (
        <Callout kind="warn" title="Sızıntı: pencerede tam periyot yok">
          Periyodik uzatma pencere kenarında zıplıyor. Enerji iki bine değil bütün binlere yayılıyor (B) ve spektral türev
          kenarda Gibbs salınımı yapıyor (A).{' '}
          {source === 'spectral' ? (
            <>
              Spektral kaynakta C ve D yine kusursuz görünür: <Tex tex="i\omega X" /> dizisi tanım gereği böyledir, ama artık
              sürekli <Tex tex="f'" />’yü değil, kenarında sıçrama olan periyodik uzatmanın türevini temsil eder.
            </>
          ) : (
            <>
              Gerçek <Tex tex="f'" /> örneklerinin spektrumu artık <Tex tex="i\omega F" /> ile örtüşmüyor (B, C, D): aradaki fark,
              kenardaki sıçramanın türevi olan ve DFT’nin gördüğü ama <Tex tex="f'" />’de olmayan darbedir.
            </>
          )}
        </Callout>
      )}
      {kind === 'gauss' && edge > 1e-6 && (
        <Callout kind="warn" title="Darbe kenarda sönmüyor">
          Kenar değeri {fmtErr(edge)}: periyodik kopyalar kenarda kırıkla birleşiyor, spektral türev kenarda salınıyor (Gibbs) ve
          analitik türevden ayrılıyor. <Tex tex="\sigma/T" />’yi küçült.
        </Callout>
      )}
      {kind === 'noisy' && (
        <Callout title="Türev gürültüyü büyütür">
          Beyaz gürültünün enerjisi bütün frekanslara eşit yayılır ve türev her bini <Tex tex="|\omega|" /> ile çarpar: en
          çok Nyquist civarı büyür. Spektral türev bunu tam yapar, sonlu fark yüksek frekansı eksik türevlediği için (E) daha
          az büyütür. Özdeşliğin kendisi (C, D) gürültüde de geçerlidir; bozulan, türevin işe yararlığıdır.
        </Callout>
      )}
    </div>
  );
}

function IntegralView({ kind, sig, t, w, order, Ts, wN, leak }: ViewProps) {
  const d = useMemo(() => {
    // DC has no 1/(iω): integrate the zero-mean part (the mean would integrate to a non-periodic ramp).
    const x0 = removeMean(sig.x);
    const { ix, X } = spectralIntegral(x0, Ts);
    const I = fft(ix);
    return {
      x0,
      ix,
      X,
      I,
      bins: energeticBins(X, REL_THRESHOLD),
      check: checkIntegral(x0, ix, Ts, REL_THRESHOLD),
      err: sig.ix && kind === 'sines' && !leak ? seriesMaxDiff(ix, sig.ix) / seriesMaxAbs(sig.ix) : null,
    };
  }, [sig, Ts, kind, leak]);

  const T = t.length * Ts;
  const xPts: Pts = t.map((tt, n) => [tt, d.x0[n]!]);
  const iPts: Pts = t.map((tt, n) => [tt, d.ix[n]!]);
  const exactPts: Pts | null = d.err !== null && sig.ix ? t.map((tt, n) => [tt, sig.ix![n]!]) : null;
  const magF = logSpectrum(order, w, (k) => magnitude(d.X, k));
  const magI = logSpectrum(order, w, (k) => magnitude(d.I, k));
  const overW = logSpectrum(order, w, (k) => (w[k] === 0 ? NaN : magnitude(d.X, k) / Math.abs(w[k]!)));
  const phase: Pts = d.bins.map((k) => [w[k]!, phaseDifference(d.X, d.I, k)]);

  const drawT = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [0, T], y: range([xPts, iPts]) }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 't', yLabel: 'f − f̄,  ∫f' });
      polyline(ctx, vp, xPts, pal.muted, 1.4);
      polyline(ctx, vp, iPts, pal.c1, 2.2);
      if (exactPts) polyline(ctx, vp, exactPts, pal.c3, 1.6, [6, 4]);
    },
    [xPts, iPts, exactPts, T],
  );

  const drawMag = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: range([magF, magI, overW]) }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: 'log₁₀ |·|' });
      polyline(ctx, vp, magF, pal.muted, 1.3);
      polyline(ctx, vp, magI, pal.c1, 2.4);
      polyline(ctx, vp, overW, pal.c4, 1.4, [5, 4]);
    },
    [magF, magI, overW, wN],
  );

  const drawPhase = useCallback(
    ({ ctx, width: W, height, palette: pal }: DrawContext) => {
      const vp = makeViewport(W, height, { x: [-wN, wN], y: [-Math.PI, Math.PI] }, PAD);
      drawGridAxes(ctx, vp, pal, { xLabel: 'ω', yLabel: 'arg F∫ − arg F' });
      polyline(ctx, vp, [[-wN, Math.PI / 2], [0, Math.PI / 2]], pal.c4, 1.4, [5, 4]);
      polyline(ctx, vp, [[0, -Math.PI / 2], [wN, -Math.PI / 2]], pal.c4, 1.4, [5, 4]);
      dots(ctx, vp, phase, pal.c1);
    },
    [phase, wN],
  );

  const ok = (v: number, lim: number) => <span className={v < lim ? 'ok' : 'bad'}>{fmtErr(v)}</span>;

  return (
    <div className="controls">
      <div className="panel">
        <Canvas draw={drawT} aspect={0.32} maxHeight={300} ariaLabel="Sinyal ve integrali" />
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--muted)' }} />f − ortalama</span>
          <span><i style={{ background: 'var(--c1)' }} />spektral F/(iω)</span>
          {exactPts && <span><i style={{ background: 'var(--c3)' }} />analitik −A cos(ωt)/ω</span>}
        </div>
        <p className="canvas-caption">
          F · DC bini atlanır: <Tex tex="1/(i\cdot 0)" /> tanımsız; sıfırdan farklı ortalama periyodik olmayan bir rampaya
          integre olurdu. Sonuç, ortalaması sıfır olan antitürevdir.
        </p>
      </div>
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={drawMag} aspect={0.55} ariaLabel="İntegral genlik spektrumu" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--muted)' }} />|F|</span>
            <span><i style={{ background: 'var(--c1)' }} />|F∫|</span>
            <span><i style={{ background: 'var(--c4)' }} />|F|/|ω| (kesikli)</span>
          </div>
        </div>
        <div className="panel">
          <Canvas draw={drawPhase} aspect={0.55} ariaLabel="İntegral faz farkı" />
          <p className="canvas-caption">
            <Tex tex="\omega>0" /> için <Tex tex="-\pi/2" />, <Tex tex="\omega<0" /> için <Tex tex="+\pi/2" />: türevin tersi.
          </p>
        </div>
      </div>
      <div className="panel readout">
        <span>
          <Tex tex="\max\big||F_\int|-|F|/|\omega|\big|/\max(|F|/|\omega|)" /> = {ok(d.check.magRelErr, 1e-10)}
        </span>
        <span>
          <Tex tex="\max\big|\Delta\arg+\operatorname{sgn}(\omega)\tfrac{\pi}{2}\big|" /> = {ok(d.check.phaseErr, 1e-8)} ({d.bins.length} bin)
        </span>
        {d.err !== null && <span>Zamanda göreli hata, analitiğe göre: {fmtErr(d.err)}</span>}
      </div>
      {kind === 'noisy' && (
        <Callout title="İntegral gürültüyü bastırır">
          <Tex tex="1/|\omega|" /> yüksek frekansları küçültür: gürültülü sinyalin integrali neredeyse gürültüsüz sinyalin
          integrali gibi görünür. Türevin tam tersi.
        </Callout>
      )}
    </div>
  );
}

