import { useCallback, useMemo, useState } from 'react';
import { errorCurve, interpolate, lebesgueConst, linspace, type ErrorCurvePoint, type NodeKind } from '../../core/math';
import {
  Canvas, Slider, Tabs, Tex, dot, drawGridAxes, fmt, makeViewport, polyline, useHashParam,
  type DrawContext, type Viewport,
} from '../../core/ui';

const FUNCS = [
  { id: 'runge', label: '1/(1+25x²)', tex: '\\frac{1}{1+25x^2}', f: (x: number) => 1 / (1 + 25 * x * x) },
  { id: 'exp', label: 'eˣ', tex: 'e^x', f: Math.exp },
  { id: 'abs', label: '|x|', tex: '|x|', f: Math.abs },
  { id: 'tanh', label: 'tanh 5x', tex: '\\tanh 5x', f: (x: number) => Math.tanh(5 * x) },
  { id: 'sin', label: 'sin 4x', tex: '\\sin 4x', f: (x: number) => Math.sin(4 * x) },
] as const;
type FuncId = (typeof FUNCS)[number]['id'];
type Show = 'both' | NodeKind;

const GRID = linspace(-1, 1, 100); // Prüfraster
const N_MIN = 2, N_MAX = 40;
const PAD = { l: 44, r: 10, t: 12, b: 24 };
const KIND_LABEL: Record<NodeKind, string> = { equi: 'eşit aralıklı', cheb: 'Çebişev' };
const KIND_COLOR: Record<NodeKind, string> = { equi: 'c1', cheb: 'c2' };

export default function Viz() {
  const [fid, setFid] = useHashParam<FuncId>('f', 'runge', FUNCS.map((f) => f.id));
  const [show, setShow] = useHashParam<Show>('nodes', 'both', ['both', 'equi', 'cheb']);
  const [n, setN] = useState(11);
  const [metric, setMetric] = useState<'max' | 'rms'>('max');
  const fn = FUNCS.find((f) => f.id === fid)!;
  const kinds: NodeKind[] = show === 'both' ? ['equi', 'cheb'] : [show];

  const exact = useMemo(() => GRID.map(fn.f), [fn]);
  const res = useMemo(() => ({
    equi: interpolate(fn.f, 'equi', n, GRID),
    cheb: interpolate(fn.f, 'cheb', n, GRID),
  }), [fn, n]);
  const lam = useMemo(() => ({
    equi: lebesgueConst(res.equi.x, res.equi.w),
    cheb: lebesgueConst(res.cheb.x, res.cheb.w),
  }), [res]);
  const curves = useMemo(() => ({
    equi: errorCurve(fn.f, 'equi', GRID, N_MIN, N_MAX),
    cheb: errorCurve(fn.f, 'cheb', GRID, N_MIN, N_MAX),
  }), [fn]);
  const meanRms = (c: ErrorCurvePoint[]) => c.reduce((s, p) => s + p.rms, 0) / c.length;

  const drawMain = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const lo = Math.min(...exact), hi = Math.max(...exact);
    const m = Math.max(0.2, (hi - lo) * 0.35);
    const vp = makeViewport(width, height, { x: [-1.05, 1.05], y: [lo - m, hi + m] }, PAD);
    drawGridAxes(ctx, vp, pal, { xLabel: 'x' });
    clip(ctx, vp, () => {
      polyline(ctx, vp, linspace(-1, 1, 400).map((t) => [t, fn.f(t)]), pal.muted, 3);
      for (const k of kinds) {
        const r = res[k], col = pal[KIND_COLOR[k] as 'c1' | 'c2'];
        polyline(ctx, vp, GRID.map((t, i) => [t, r.p[i]!]), col, 1.8);
        // largest deviation on the grid: vertical bar from f to p
        const i = r.argmax, t = GRID[i]!;
        polyline(ctx, vp, [[t, exact[i]!], [t, r.p[i]!]], col, 1.5, [3, 3]);
        r.x.forEach((xj, j) => dot(ctx, vp, [xj, r.fx[j]!], col, 5));
      }
      GRID.forEach((t, i) => dot(ctx, vp, [t, exact[i]!], pal.fg, 1.6));
    });
  }, [exact, fn, res, kinds]);

  const drawCurve = useCallback(({ ctx, width, height, palette: pal }: DrawContext) => {
    const vals = kinds.flatMap((k) => curves[k].flatMap((p) => [p[metric], p.lebesgue]));
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
      polyline(ctx, vp, curves[k].map((p) => [p.n, L(p.lebesgue)]), col, 1.2, [6, 4]);
    }
  }, [curves, kinds, metric, n]);

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
          <Tex tex={`f(x)=${fn.tex}`} />, 100 noktalı test ızgarası ve <Tex tex="p_{n-1}" /> (barisentrik)
        </h3>
        <Canvas draw={drawMain} aspect={0.5} ariaLabel="Fonksiyon, test ızgarası, düğümler ve iki interpolasyon polinomu" />
        <div className="legend" style={{ marginTop: 6 }}>
          <span><i style={{ background: 'var(--muted)', height: 4 }} />f</span>
          <span><i style={{ background: 'var(--fg)' }} />100 test noktası</span>
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
              <th>RMS <Tex tex="\sqrt{\tfrac1{100}\sum (p-f)^2}" /></th>
              <th>en büyük sapma <Tex tex="\max|p-f|" /></th>
              <th>Lebesgue <Tex tex="\Lambda_n" /></th>
              <th>ortalama RMS (n = {N_MIN}…{N_MAX})</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k} style={{ textAlign: 'right', color: `var(--${KIND_COLOR[k]})` }}>
                <td style={{ textAlign: 'left' }}>{KIND_LABEL[k]}</td>
                <td>{sci(res[k].rms)}</td>
                <td>{sci(res[k].max)} <span className="muted">(x = {fmt(GRID[res[k].argmax]!, 2)})</span></td>
                <td>{sci(lam[k])}</td>
                <td>{sci(meanRms(curves[k]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel controls">
        <h3 style={{ margin: 0, fontSize: 14 }}>
          Hata eğrisi <Tex tex="e_{\text{interp}}(n)" />, n = {N_MIN}…{N_MAX} (logaritmik)
        </h3>
        <Tabs value={metric} onChange={setMetric} items={[
          { id: 'max', label: 'en büyük sapma' }, { id: 'rms', label: 'RMS' },
        ]} />
        <Canvas draw={drawCurve} aspect={0.45} ariaLabel="n'ye göre interpolasyon hatası ve Lebesgue sabiti, log ölçek" />
        <div className="legend">
          {kinds.map((k) => (
            <span key={k}><i style={{ background: `var(--${KIND_COLOR[k]})` }} />{KIND_LABEL[k]}: düz = hata, kesikli = <Tex tex="\Lambda_n" /></span>
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
