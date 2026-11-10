import { useCallback, useMemo, useState } from 'react';
import {
  THERMO_RANGE, errorCurve, interpolate, lebesgueConst, linspace, thermoCalibrator, thermoT,
  type ErrorCurvePoint, type NodeKind,
} from '../../core/math';
import {
  Canvas, Slider, Tabs, Tex, dot, drawGridAxes, fmt, makeViewport, polyline, useHashParam,
  type DrawContext, type Viewport,
} from '../../core/ui';

interface Func {
  id: string; label: string; tex: string;
  /** data at the nodes */
  f: (x: number) => number;
  /** exact function the errors are measured against (default f) */
  ref?: (x: number) => number;
  dom: [number, number];
  grid: number[];
  x: string;
  unit: string;
}
const UNIT_GRID = linspace(-1, 1, 100); // Prüfraster
const THERMO_GRID = linspace(THERMO_RANGE[0], THERMO_RANGE[1], 2000);
const unit = (id: string, label: string, tex: string, f: (x: number) => number): Func =>
  ({ id, label, tex, f, dom: [-1, 1], grid: UNIT_GRID, x: 'x', unit: '' });
const FUNCS: Func[] = [
  unit('runge', '1/(1+25x²)', '\\frac{1}{1+25x^2}', (x) => 1 / (1 + 25 * x * x)),
  unit('exp', 'eˣ', 'e^x', Math.exp),
  unit('abs', '|x|', '|x|', Math.abs),
  unit('tanh', 'tanh 5x', '\\tanh 5x', (x) => Math.tanh(5 * x)),
  unit('sin', 'sin 4x', '\\sin 4x', (x) => Math.sin(4 * x)),
  { id: 'texakt', label: 'T_exakt (Typ K)', tex: 'T_{\\text{exakt}}(E)', f: thermoT, dom: THERMO_RANGE, grid: THERMO_GRID, x: 'E (mV)', unit: ' °C' },
  { id: 'tkal', label: 'T_kalibrator', tex: 'T_{\\text{kal}}(E)', f: thermoCalibrator, ref: thermoT, dom: THERMO_RANGE, grid: THERMO_GRID, x: 'E (mV)', unit: ' °C' },
];
type FuncId = string;
type Show = 'both' | NodeKind;
type View = 'fn' | 'err';
/** calibrator rounds to 0.01 °C → every data value is off by at most δ */
const DELTA = 0.005;
const N_MIN = 2, N_MAX = 40;
const PAD = { l: 44, r: 10, t: 12, b: 24 };
const KIND_LABEL: Record<NodeKind, string> = { equi: 'eşit aralıklı', cheb: 'Çebişev' };
const KIND_COLOR: Record<NodeKind, string> = { equi: 'c1', cheb: 'c2' };

export default function Viz() {
  const [fid, setFid] = useHashParam<FuncId>('f', 'runge', FUNCS.map((f) => f.id));
  const [show, setShow] = useHashParam<Show>('nodes', 'both', ['both', 'equi', 'cheb']);
  const [n, setN] = useState(11);
  const [metric, setMetric] = useState<'max' | 'rms'>('max');
  const [view, setView] = useState<View>('fn');
  const fn = FUNCS.find((f) => f.id === fid)!;
  const ref = fn.ref ?? fn.f;
  const noisy = fn.ref !== undefined;
  const GRID = fn.grid;
  const [a, b] = fn.dom;
  const kinds: NodeKind[] = show === 'both' ? ['equi', 'cheb'] : [show];

  const exact = useMemo(() => GRID.map(ref), [GRID, ref]);
  const res = useMemo(() => ({
    equi: interpolate(fn.f, 'equi', n, GRID, a, b, ref),
    cheb: interpolate(fn.f, 'cheb', n, GRID, a, b, ref),
  }), [fn, n, GRID, a, b, ref]);
  const lam = useMemo(() => ({
    equi: lebesgueConst(res.equi.x, res.equi.w, a, b),
    cheb: lebesgueConst(res.cheb.x, res.cheb.w, a, b),
  }), [res, a, b]);
  const curves = useMemo(() => ({
    equi: errorCurve(fn.f, 'equi', GRID, N_MIN, N_MAX, a, b, ref),
    cheb: errorCurve(fn.f, 'cheb', GRID, N_MIN, N_MAX, a, b, ref),
  }), [fn, GRID, a, b, ref]);
  const cur = (k: NodeKind) => curves[k][n - N_MIN]!;
  const meanRms = (c: ErrorCurvePoint[]) => c.reduce((s, p) => s + p.rms, 0) / c.length;

  const drawMain = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const xr: [number, number] = [a - 0.025 * (b - a), b + 0.025 * (b - a)];
    if (view === 'err') {
      const m = Math.max(1e-300, ...kinds.map((k) => res[k].max)) * 1.2;
      const vp = makeViewport(width, height, { x: xr, y: [-m, m] }, PAD);
      drawGridAxes(ctx, vp, pal, { ticks: 12, xLabel: fn.x, yLabel: `p − f${fn.unit}` });
      clip(ctx, vp, () => {
        polyline(ctx, vp, [[a, 0], [b, 0]], pal.muted, 2);
        for (const k of kinds) {
          const r = res[k], col = pal[KIND_COLOR[k] as 'c1' | 'c2'];
          polyline(ctx, vp, GRID.map((t, i) => [t, r.p[i]! - exact[i]!]), col, 1.6);
          r.x.forEach((xj, j) => dot(ctx, vp, [xj, r.fx[j]! - ref(xj)], col, 4));
          const i = r.argmax;
          polyline(ctx, vp, [[GRID[i]!, 0], [GRID[i]!, r.p[i]! - exact[i]!]], col, 1.5, [3, 3]);
        }
      });
      return;
    }
    const lo = Math.min(...exact), hi = Math.max(...exact);
    const m = Math.max(0.2, (hi - lo) * 0.35);
    const vp = makeViewport(width, height, { x: xr, y: [lo - m, hi + m] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: fn.x });
    clip(ctx, vp, () => {
      polyline(ctx, vp, linspace(a, b, 400).map((t) => [t, ref(t)]), pal.muted, 3);
      for (const k of kinds) {
        const r = res[k], col = pal[KIND_COLOR[k] as 'c1' | 'c2'];
        polyline(ctx, vp, GRID.map((t, i) => [t, r.p[i]!]), col, 1.8);
        // largest deviation on the grid: vertical bar from f to p
        const i = r.argmax, t = GRID[i]!;
        polyline(ctx, vp, [[t, exact[i]!], [t, r.p[i]!]], col, 1.5, [3, 3]);
        r.x.forEach((xj, j) => dot(ctx, vp, [xj, r.fx[j]!], col, 5));
      }
      if (GRID.length <= 200) GRID.forEach((t, i) => dot(ctx, vp, [t, exact[i]!], pal.fg, 1.6));
    });
  }, [exact, fn, res, kinds, view, a, b, GRID, ref]);

  const drawCurve = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lamLine = (p: ErrorCurvePoint) => (noisy ? p.lebesgue * DELTA : p.lebesgue);
    const vals = kinds.flatMap((k) => curves[k].flatMap((p) => [p[metric], lamLine(p), ...(noisy ? [p.data] : [])]));
    const logs = vals.filter((v) => v > 0 && Number.isFinite(v)).map(Math.log10);
    const y0 = Math.max(-17, Math.floor(Math.min(...logs))), y1 = Math.ceil(Math.max(...logs));
    const vp = makeViewport(width, height, { x: [N_MIN - 0.5, N_MAX + 0.5], y: [y0, y1 + 0.2] }, PAD);
    drawGridAxes(ctx, vp, pal, { labels: false });
    logLabels(ctx, vp, pal.muted, y0, y1);
    const L = (v: number) => (v > 0 ? Math.max(y0, Math.log10(v)) : y0);
    polyline(ctx, vp, [[n, y0], [n, y1 + 0.2]], pal.axis, 1, [2, 3]);
    for (const k of kinds) {
      const col = pal[KIND_COLOR[k] as 'c1' | 'c2'];
      polyline(ctx, vp, curves[k].map((p) => [p.n, L(p[metric])]), col, 2);
      curves[k].forEach((p) => dot(ctx, vp, [p.n, L(p[metric])], col, p.n === n ? 5 : 2.2));
      polyline(ctx, vp, curves[k].map((p) => [p.n, L(lamLine(p))]), col, 1.2, [6, 4]);
      if (noisy) polyline(ctx, vp, curves[k].map((p) => [p.n, L(p.data)]), col, 1.4, [1.5, 3]);
    }
  }, [curves, kinds, metric, n, noisy]);

  return (
    <div className="controls">
      <div className="row">
        {FUNCS.map((f) => (
          <button key={f.id} className="btn" aria-pressed={fid === f.id} onClick={() => setFid(f.id)}>{f.label}</button>
        ))}
      </div>
      <Slider label={<>Düğüm sayısı <Tex tex="n" /></>} value={n} min={N_MIN} max={N_MAX} step={1} onChange={setN}
        format={(v) => `${v} (derece ${v - 1})`} />
      <Tabs value={show} onChange={setShow} items={[
        { id: 'both', label: 'İkisi birden' }, { id: 'equi', label: 'Eşit aralıklı' }, { id: 'cheb', label: 'Çebişev' },
      ]} />

      <div className="panel">
        <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>
          <Tex tex={`f=${fn.tex}`} />, {GRID.length} noktalı test ızgarası ve <Tex tex="p_{n-1}" /> (barisentrik)
          {noisy && <> · düğüm değerleri 0,01 °C'ye yuvarlı, hata <Tex tex="T_{\text{exakt}}" />'a göre</>}
        </h3>
        <Tabs value={view} onChange={setView} items={[
          { id: 'fn', label: 'f ve p' }, { id: 'err', label: 'hata p − f' },
        ]} />
        <Canvas draw={drawMain} aspect={0.5} ariaLabel="Fonksiyon, test ızgarası, düğümler ve iki interpolasyon polinomu" />
        <div className="legend" style={{ marginTop: 6 }}>
          <span><i style={{ background: 'var(--muted)', height: 4 }} />f</span>
          {GRID.length <= 200 && <span><i style={{ background: 'var(--fg)' }} />{GRID.length} test noktası</span>}
          {kinds.map((k) => (
            <span key={k}><i style={{ background: `var(--${KIND_COLOR[k]})` }} />{KIND_LABEL[k]}: düğümler ve p; kesikli çubuk = en büyük sapma</span>
          ))}
        </div>
      </div>

      <div className="panel" style={{ overflowX: 'auto' }}>
        <table className="mat-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'right' }}>
              <th style={{ textAlign: 'left' }}>n = {n}</th>
              <th>RMS <Tex tex="\sqrt{\tfrac1{N}\sum (p-f)^2}" /></th>
              <th>en büyük sapma <Tex tex="\max|p-f|" /></th>
              <th>Lebesgue <Tex tex="\Lambda_n=\max\sum_j|\ell_j|" /></th>
              {noisy && <th>veri hatası <Tex tex="e_{\text{daten}}" /></th>}
              {noisy && <th>sınır <Tex tex="\Lambda_n\cdot\delta" /></th>}
              <th>ortalama RMS (n = {N_MIN}…{N_MAX})</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k} style={{ textAlign: 'right', color: `var(--${KIND_COLOR[k]})` }}>
                <td style={{ textAlign: 'left' }}>{KIND_LABEL[k]}</td>
                <td>{sci(res[k].rms)}</td>
                <td>{sci(res[k].max)}{fn.unit} <span className="muted">({fn.x.split(' ')[0]} = {fmt(GRID[res[k].argmax]!, 2)})</span></td>
                <td>{sci(lam[k])}</td>
                {noisy && <td>{sci(cur(k).data)}{fn.unit}</td>}
                {noisy && <td>{sci(lam[k] * DELTA)}{fn.unit}</td>}
                <td>{sci(meanRms(curves[k]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {noisy && (
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            <Tex tex="\delta=0{,}005" /> °C (yarım gösterge basamağı). <Tex tex="e_{\text{daten}}=\max|p[T_{\text{kal}}]-p[T_{\text{exakt}}]|\le\Lambda_n\delta" />;
            toplam hata <Tex tex="\le e_{\text{interp}}+e_{\text{daten}}" /> (<Tex tex="e_{\text{interp}}" /> için T_exakt'ı seç).
          </p>
        )}
      </div>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 14 }}>
          Hata eğrisi {noisy ? <>(toplam hata, <Tex tex="e_{\text{daten}}" /> ve <Tex tex="\Lambda_n\delta" />)</> : <Tex tex="e_{\text{interp}}(n)" />}, n = {N_MIN}…{N_MAX} (logaritmik)
        </h3>
        <Tabs value={metric} onChange={setMetric} items={[
          { id: 'max', label: 'en büyük sapma' }, { id: 'rms', label: 'RMS' },
        ]} />
        <Canvas draw={drawCurve} aspect={0.45} ariaLabel="n'ye göre interpolasyon hatası ve Lebesgue sabiti, log ölçek" />
        <div className="legend">
          {kinds.map((k) => (
            <span key={k}><i style={{ background: `var(--${KIND_COLOR[k]})` }} />{KIND_LABEL[k]}: düz = hata, kesikli = {noisy
              ? <><Tex tex="\Lambda_n\cdot\delta" />, noktalı = <Tex tex="e_{\text{daten}}" /></>
              : <Tex tex="\Lambda_n" />}</span>
          ))}
          <span>dikey çizgi = seçili n</span>
        </div>
      </div>
    </div>
  );
}

function sci(v: number) {
  if (!Number.isFinite(v)) return '∞';
  return v === 0 ? '0' : v >= 0.01 && v < 1000 ? fmt(v, 4) : v.toExponential(2);
}

function clip(ctx: CanvasRenderingContext2D, vp: Viewport, body: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(vp.left, vp.top, vp.right - vp.left, vp.bottom - vp.top);
  ctx.clip();
  body();
  ctx.restore();
}

/** x ticks every 4 and y labels as powers of ten. */
function logLabels(ctx: CanvasRenderingContext2D, vp: Viewport, color: string, y0: number, y1: number) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const step = Math.max(1, Math.ceil((y1 - y0) / 8));
  for (let e = y0; e <= y1; e += step) ctx.fillText(`1e${e}`, vp.left - 4, vp.y(e));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = 4; k <= N_MAX; k += 4) ctx.fillText(String(k), vp.x(k), vp.bottom + 4);
  ctx.font = 'italic 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('n', vp.right, vp.bottom - 3);
  ctx.restore();
}
