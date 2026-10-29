import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { compile, evalConst, ExprError, principalAxes3, type Compiled, type Vec } from '../../core/math';
import {
  Canvas,
  Slider,
  Tex,
  camera,
  depth,
  drawGridAxes,
  fmt,
  label,
  makeViewport,
  polyline,
  project,
  type CanvasPointer,
  type DrawContext,
  type Palette,
} from '../../core/ui';

type Dim = 1 | 2 | 3;
type P3 = [number, number, number];

const PARAMS = ['a', 'b', 'c'];
const COORDS = ['x', 'y', 'z'];
const VIEW_R = 2.3;

interface Setup {
  f: string[];
  ranges: [string, string][];
  T: string;
}

const DEFAULTS: Record<Dim, Setup> = {
  1: { f: ['exp(a/2)'], ranges: [['-2', '2']], T: 'sin(3a)' },
  2: { f: ['a cos(b)', 'a sin(b)'], ranges: [['0', '2'], ['0', '2pi']], T: 'exp(-a^2/2) cos(3b)' },
  3: {
    f: ['a sin(b) cos(c)', 'a sin(b) sin(c)', 'a cos(b)'],
    ranges: [['0.3', '1'], ['0', 'pi'], ['0', '2pi']],
    T: 'x y + z',
  },
};

/** Compile one field; returns the compiled formula or the error text. */
function tryCompile(src: string, allowed: string[]): Compiled | string {
  try {
    return compile(src, allowed);
  } catch (e) {
    return e instanceof ExprError ? e.message : String(e);
  }
}

// ---------- colour helpers (palette hex -> rgb) ----------
const hexRgb = (h: string): P3 => {
  const s = h.replace('#', '');
  const f = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as P3;
};
/** Low → mid → high: c1 → c3 → c2. */
function colormap(pal: Palette, u: number): P3 {
  const stops = [hexRgb(pal.c1), hexRgb(pal.c3), hexRgb(pal.c2)];
  const t = Math.min(1, Math.max(0, Number.isFinite(u) ? u : 0)) * 2;
  const [p, q] = t < 1 ? [stops[0]!, stops[1]!] : [stops[1]!, stops[2]!];
  const w = t < 1 ? t : t - 1;
  return [0, 1, 2].map((i) => p[i]! + (q[i]! - p[i]!) * w) as P3;
}
const rgb = (c: P3, k = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(',')})`;

const finite = (...v: number[]) => v.every(Number.isFinite);
function span(vals: ArrayLike<number>): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i]!;
    if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  if (!(hi >= lo)) return [-1, 1];
  return hi - lo < 1e-12 ? [lo - 0.5, hi + 0.5] : [lo, hi];
}

/** Samples of the map F and the field T on a regular parameter grid. */
interface Samples {
  n: Dim;
  res: number;
  /** per sample: coordinates x_i = f_i(params) */
  X: Float64Array[];
  T: Float64Array;
  /** per sample: parameter values */
  A: Float64Array[];
}

function sample(n: Dim, fs: Compiled[], T: Compiled, ranges: [number, number][], res: number): Samples {
  const count = res ** n;
  const X = Array.from({ length: n }, () => new Float64Array(count));
  const A = Array.from({ length: n }, () => new Float64Array(count));
  const Tv = new Float64Array(count);
  const vals = new Float64Array(2 * n);
  for (let s = 0; s < count; s++) {
    let r = s;
    for (let d = 0; d < n; d++) {
      const i = r % res;
      r = Math.floor(r / res);
      const [lo, hi] = ranges[d]!;
      vals[d] = lo + ((hi - lo) * i) / (res - 1);
      A[d]![s] = vals[d]!;
    }
    for (let d = 0; d < n; d++) X[d]![s] = vals[n + d] = fs[d]!.fn(vals);
    Tv[s] = T.fn(vals);
  }
  return { n, res, X, T: Tv, A };
}

export default function Viz() {
  const [n, setN] = useState<Dim>(2);
  const [setup, setSetup] = useState<Setup>(DEFAULTS[2]);
  const [res, setRes] = useState(40);
  const [colored, setColored] = useState(true);
  const [mode3, setMode3] = useState<'cloud' | 'svd'>('cloud');
  const [zScale, setZScale] = useState(1);
  const [view, setView] = useState({ az: -0.9, el: 0.55 });
  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  const chooseDim = (d: Dim) => {
    setN(d);
    setSetup(DEFAULTS[d]);
    setRes(d === 1 ? 300 : d === 2 ? 40 : 12);
  };

  const params = PARAMS.slice(0, n);
  const coords = COORDS.slice(0, n);

  const compiled = useMemo(() => {
    const fs = setup.f.map((src) => tryCompile(src, params));
    const T = tryCompile(setup.T, [...params, ...coords]);
    const ranges = setup.ranges.map(([lo, hi]) => [evalConst(lo), evalConst(hi)] as [number, number]);
    return { fs, T, ranges };
    // params/coords derive from n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, n]);

  const rangeErr = compiled.ranges.map(([lo, hi]) => (!finite(lo, hi) ? 'Sayı ya da sabit ifade yaz (ör. 2pi)' : hi <= lo ? 'Üst sınır alttan büyük olmalı' : ''));
  const ok =
    compiled.fs.every((f) => typeof f !== 'string') && typeof compiled.T !== 'string' && rangeErr.every((e) => !e);

  const data = useMemo(
    () => (ok ? sample(n, compiled.fs as Compiled[], compiled.T as Compiled, compiled.ranges, res) : null),
    [ok, n, compiled, res],
  );

  // 3D: principal axes of the point cloud (x, y, z) for the SVD view
  const pca = useMemo(() => {
    if (!data || n !== 3) return null;
    const pts: P3[] = [];
    for (let s = 0; s < data.T.length; s++) {
      const p: P3 = [data.X[0]![s]!, data.X[1]![s]!, data.X[2]![s]!];
      if (finite(...p)) pts.push(p);
    }
    return principalAxes3(pts);
  }, [data, n]);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      if (!data) {
        ctx.fillStyle = pal.muted;
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Formülde hata var: aşağıdaki kırmızı notlara bak.', 16, 28);
        return;
      }
      if (n === 1) draw1(ctx, width, height, pal, data, colored);
      else if (n === 2) draw2(ctx, width, height, pal, data, colored, zScale, view);
      else draw3(ctx, width, height, pal, data, mode3, pca, zScale, view);
    },
    [data, n, colored, zScale, view, mode3, pca],
  );

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      if (n === 1) return;
      if (p.type === 'down') drag.current = { x: p.x, y: p.y, az: view.az, el: view.el };
      else if (p.type === 'up') drag.current = null;
      else if (drag.current && p.buttons) {
        const d = drag.current;
        setView({ az: d.az - (p.x - d.x) * 0.01, el: Math.max(-1.45, Math.min(1.45, d.el + (p.y - d.y) * 0.01)) });
      }
    },
    [n, view],
  );

  const setF = (i: number, v: string) => setSetup({ ...setup, f: setup.f.map((s, j) => (j === i ? v : s)) });
  const setRange = (i: number, k: 0 | 1, v: string) =>
    setSetup({ ...setup, ranges: setup.ranges.map((r, j) => (j === i ? (k === 0 ? [v, r[1]] : [r[0], v]) : r)) });

  const tSpan = data ? span(data.T) : ([0, 1] as [number, number]);
  const pTex = params.join(',');
  const cTex = coords.join(',');

  return (
    <div className="controls">
      <div className="row">
        <span style={{ fontSize: 14 }}>Boyut sayısı:</span>
        {([1, 2, 3] as Dim[]).map((d) => (
          <button key={d} className="btn" aria-pressed={n === d} onClick={() => chooseDim(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="viz-grid">
        <div className="panel">
          <Canvas
            draw={draw}
            aspect={0.85}
            maxHeight={620}
            onPointer={onPointer}
            ariaLabel={n === 1 ? 'T’nin yeni koordinat x’e göre grafiği' : '3B grafik; sürükleyince kamera döner'}
          />
          {data && (
            <div className="legend" style={{ marginTop: 8, alignItems: 'center' }}>
              {(colored || n === 3) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  T = {fmt(tSpan[0], 2)}
                  <i style={{ width: 90, height: 8, background: 'linear-gradient(90deg, var(--c1), var(--c3), var(--c2))' }} />
                  {fmt(tSpan[1], 2)}
                </span>
              )}
            </div>
          )}
          <p className="canvas-caption">
            {n === 1
              ? 'Alttaki çentikler eşit aralıklı a değerlerinin x eksenine düştüğü yerler: yeni koordinatın sıklığı.'
              : 'Sürükle: kamerayı döndür. ' +
                (n === 2
                  ? 'Zemindeki çizgiler a = sabit ve b = sabit eğrileri (yeni koordinat ağı); yüzeyin yüksekliği T.'
                  : mode3 === 'cloud'
                    ? 'Her nokta bir (a, b, c) örneği; konumu (x, y, z), rengi T.'
                    : 'Nokta bulutu en büyük iki tekil vektörün düzlemine izdüşürüldü; yükseklik ve renk T.')}
          </p>
        </div>

        <div className="panel controls">
          <h3 style={{ margin: 0, fontSize: 15 }}>1. Yeni koordinat sistemi F</h3>
          {setup.f.map((src, i) => {
            const c = compiled.fs[i]!;
            return (
              <Field
                key={`${n}-f${i}`}
                label={<Tex tex={`${coords[i]}=f_{${i + 1}}(${pTex})=`} />}
                value={src}
                onChange={(v) => setF(i, v)}
                error={typeof c === 'string' ? c : ''}
                info={typeof c === 'string' ? '' : c.vars.length ? `kullanılan: ${c.vars.join(', ')}` : 'sabit'}
              />
            );
          })}
          {params.map((p, i) => (
            <div key={`${n}-r${i}`} className="row" style={{ gap: 6, alignItems: 'center', fontSize: 14 }}>
              <Tex tex={`${p}\\in[`} />
              <SmallInput value={setup.ranges[i]![0]} onChange={(v) => setRange(i, 0, v)} />
              <span>,</span>
              <SmallInput value={setup.ranges[i]![1]} onChange={(v) => setRange(i, 1, v)} />
              <Tex tex="]" />
              {rangeErr[i] && <span style={{ color: 'var(--c2)', fontSize: 12 }}>{rangeErr[i]}</span>}
            </div>
          ))}

          <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>2. Skaler fonksiyon T</h3>
          <Field
            label={<Tex tex={`T=`} />}
            value={setup.T}
            onChange={(v) => setSetup({ ...setup, T: v })}
            error={typeof compiled.T === 'string' ? compiled.T : ''}
            info={typeof compiled.T === 'string' ? '' : compiled.T.vars.length ? `kullanılan: ${compiled.T.vars.join(', ')}` : 'sabit'}
          />
          <div className="readout" style={{ fontSize: 14 }}>
            <Tex block tex={`(${pTex})\\;\\xrightarrow{\\;F\\;}\\;(${cTex})=F(${pTex})\\;\\xrightarrow{\\;T\\;}\\;T\\in\\mathbb{R}`} />
            <p style={{ margin: '4px 0 0' }}>
              T’yi parametrelerle (<Tex tex={pTex} />), yeni koordinatlarla (<Tex tex={cTex} />) ya da ikisini karışık
              yazabilirsin. <Tex tex={cTex} /> kullandığında önce F uygulanır:{' '}
              <Tex tex={`T(${pTex})=T\\big(F(${pTex})\\big)`} />.
            </p>
            {n === 1 && <p style={{ margin: '4px 0 0' }}>Grafik: yatay eksen <Tex tex="x=f_1(a)" />, düşey eksen T.</p>}
            {n === 2 && <p style={{ margin: '4px 0 0' }}>Grafik: zemin <Tex tex="(x,y)=F(a,b)" />, yükseklik <Tex tex="z=T" />.</p>}
          </div>

          <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>3. Görünüm</h3>
          <Slider
            label={n === 1 ? 'Örnek sayısı' : 'Her parametrede örnek'}
            value={res}
            min={n === 1 ? 50 : n === 2 ? 8 : 4}
            max={n === 1 ? 1000 : n === 2 ? 90 : 22}
            step={1}
            onChange={setRes}
            format={(v) => (n === 1 ? String(v) : `${v} (${v ** n} nokta)`)}
          />
          {(n === 2 || (n === 3 && mode3 === 'svd')) && <Slider label="T ekseni ölçeği" value={zScale} min={0.2} max={3} onChange={setZScale} format={(v) => `${fmt(v, 2)}×`} />}
          {n !== 3 && (
            <label className="row" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={colored} onChange={(e) => setColored(e.target.checked)} />
              Renkli (renk = T)
            </label>
          )}
          {n === 3 && (
            <div className="row">
              <button className="btn" aria-pressed={mode3 === 'cloud'} onClick={() => setMode3('cloud')}>
                Nokta bulutu (x, y, z), renk T
              </button>
              <button className="btn" aria-pressed={mode3 === 'svd'} onClick={() => setMode3('svd')}>
                SVD: en büyük 2 yön + T
              </button>
            </div>
          )}
          {n === 3 && mode3 === 'svd' && pca && <SvdReadout pca={pca} />}
        </div>
      </div>
    </div>
  );
}

function SvdReadout({ pca }: { pca: ReturnType<typeof principalAxes3> }) {
  const [s1, s2, s3] = pca.sigma;
  const kept = (s1 ** 2 + s2 ** 2) / (s1 ** 2 + s2 ** 2 + s3 ** 2 || 1);
  const v = (u: P3) => `\\begin{bmatrix}${u.map((c) => fmt(c, 2)).join('\\\\')}\\end{bmatrix}`;
  return (
    <div className="readout" style={{ fontSize: 14 }}>
      <Tex block tex={`\\sigma_1=${fmt(s1, 2)},\\;\\sigma_2=${fmt(s2, 2)},\\;\\sigma_3=${fmt(s3, 2)}`} />
      <Tex block tex={`v_1=${v(pca.axes[0]!)},\\; v_2=${v(pca.axes[1]!)}`} />
      <p style={{ margin: 0 }}>
        Korunan yayılım <Tex tex="(\sigma_1^2+\sigma_2^2)/\sum\sigma_i^2" /> = <b>%{fmt(100 * kept, 1)}</b>.{' '}
        {kept > 0.97
          ? 'Nokta bulutu neredeyse bir düzlemde: izdüşüm az bilgi kaybediyor.'
          : 'Üçüncü yön ihmal edilemez: farklı noktalar üst üste düşer, aynı yerde birden çok T değeri görünür.'}
      </p>
    </div>
  );
}

const inputStyle = {
  font: 'inherit',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 14,
  padding: '4px 8px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-elev)',
  color: 'var(--fg)',
} as const;

function Field(props: { label: ReactNode; value: string; onChange: (v: string) => void; error: string; info: string }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <label className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
        <span style={{ whiteSpace: 'nowrap' }}>{props.label}</span>
        <input
          type="text"
          spellCheck={false}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 0, borderColor: props.error ? 'var(--c2)' : 'var(--border)' }}
        />
      </label>
      <span style={{ fontSize: 12, color: props.error ? 'var(--c2)' : 'var(--muted)' }}>{props.error || props.info}</span>
    </div>
  );
}

function SmallInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="text" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, width: 72 }} />;
}

// ---------- drawing ----------

function draw1(ctx: CanvasRenderingContext2D, width: number, height: number, pal: Palette, d: Samples, colored: boolean) {
  const xs = d.X[0]!, ts = d.T;
  const [x0, x1] = span(xs), [t0, t1] = span(ts);
  const px = 0.04 * (x1 - x0), pt = 0.08 * (t1 - t0);
  const vp = makeViewport(width, height, { x: [x0 - px, x1 + px], y: [t0 - pt, t1 + pt] }, { l: 44, r: 14, t: 14, b: 30 });
  drawGridAxes(ctx, vp, pal, { xLabel: 'x = f₁(a)', yLabel: 'T' });
  for (let s = 0; s + 1 < xs.length; s++) {
    const c = colored ? rgb(colormap(pal, ((ts[s]! + ts[s + 1]!) / 2 - t0) / (t1 - t0))) : pal.c1;
    polyline(ctx, vp, [[xs[s]!, ts[s]!], [xs[s + 1]!, ts[s + 1]!]], c, 2.2);
  }
  // where equally spaced a values land on the x axis
  ctx.save();
  ctx.strokeStyle = pal.c4;
  ctx.lineWidth = 1;
  const every = Math.max(1, Math.round(xs.length / 30));
  for (let s = 0; s < xs.length; s += every) {
    if (!Number.isFinite(xs[s]!)) continue;
    const X = vp.x(xs[s]!);
    ctx.beginPath();
    ctx.moveTo(X, vp.bottom);
    ctx.lineTo(X, vp.bottom - 7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Uniform fit for the coordinates, separate fit (times zScale) for T. */
function fitter(cols: Float64Array[], t: Float64Array, zScale: number) {
  const spans = cols.map(span);
  const mids = spans.map(([lo, hi]) => (lo + hi) / 2);
  const s = 2.9 / Math.max(...spans.map(([lo, hi]) => hi - lo));
  const [t0, t1] = span(t);
  const zs = (1.6 / (t1 - t0)) * zScale;
  const tm = (t0 + t1) / 2;
  return { s, mids, spans, t0, t1, zs, tm, W: (c: number, i: number) => (c - mids[i]!) * s, Z: (v: number) => (v - tm) * zs };
}

function lightDir(cam: ReturnType<typeof camera>): Vec {
  // light from the upper left, fairly oblique so slopes read clearly
  const L = cam.toViewer.map((c, i) => 0.45 * c + 0.75 * cam.up[i]! - 0.55 * cam.right[i]!);
  const l = Math.hypot(...L);
  return L.map((c) => c / l);
}

function draw2(
  ctx: CanvasRenderingContext2D, width: number, height: number, pal: Palette, d: Samples,
  colored: boolean, zScale: number, view: { az: number; el: number },
) {
  const cam = camera(view.az, view.el);
  const vp = makeViewport(width, height, { x: [-VIEW_R, VIEW_R], y: [-VIEW_R, VIEW_R] }, { l: 8, r: 8, t: 8, b: 8 }, true);
  const P = (p: Vec) => project(cam, p);
  const F = fitter([d.X[0]!, d.X[1]!], d.T, zScale);
  const R = d.res;
  const world = (s: number): P3 => [F.W(d.X[0]![s]!, 0), F.W(d.X[1]![s]!, 1), F.Z(d.T[s]!)];
  const floorZ = F.Z(F.t0) - 0.15;

  // the new coordinate grid on the floor: a = const and b = const curves
  const step = Math.max(1, Math.round(R / 10));
  for (let k = 0; k < R; k += step) {
    for (const dir of [0, 1]) {
      const pts: [number, number][] = [];
      for (let m = 0; m < R; m++) {
        const s = dir === 0 ? k + m * R : m + k * R;
        const w = world(s);
        pts.push(Number.isFinite(w[0]) && Number.isFinite(w[1]) ? P([w[0], w[1], floorZ]) : [NaN, NaN]);
      }
      polyline(ctx, vp, pts, dir === 0 ? pal.c1 : pal.c4, 1);
    }
  }
  box(ctx, vp, pal, P, F, [F.W(F.spans[0]![0], 0), F.W(F.spans[0]![1], 0)], [F.W(F.spans[1]![0], 1), F.W(F.spans[1]![1], 1)], floorZ, ['x', 'y']);

  // surface quads, far to near, shaded by |n·L|
  const L = lightDir(cam);
  const quads: { pts: P3[]; dep: number; tm: number; sh: number }[] = [];
  for (let j = 0; j + 1 < R; j++)
    for (let i = 0; i + 1 < R; i++) {
      const idx = [i + j * R, i + 1 + j * R, i + 1 + (j + 1) * R, i + (j + 1) * R];
      const pts = idx.map(world);
      if (!pts.every((p) => finite(...p))) continue;
      const u = pts[2]!.map((c, k) => c - pts[0]![k]!), v = pts[3]!.map((c, k) => c - pts[1]![k]!);
      const nrm = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      const nl = Math.hypot(...nrm) || 1;
      const lam = Math.abs(nrm[0]! * L[0]! + nrm[1]! * L[1]! + nrm[2]! * L[2]!) / nl;
      quads.push({
        pts,
        dep: pts.reduce((a, p) => a + depth(cam, p), 0) / 4,
        tm: idx.reduce((a, s) => a + d.T[s]!, 0) / 4,
        sh: 0.22 + 0.9 * lam,
      });
    }
  quads.sort((a, b) => a.dep - b.dep);
  const base = hexRgb(pal.c1);
  ctx.save();
  ctx.lineWidth = 0.6;
  ctx.lineJoin = 'round';
  for (const q of quads) {
    const c = colored ? colormap(pal, (q.tm - F.t0) / (F.t1 - F.t0)) : base;
    ctx.fillStyle = rgb(c, q.sh);
    ctx.strokeStyle = rgb(c, q.sh * 0.82);
    ctx.beginPath();
    q.pts.forEach((p, k) => {
      const [sx, sy] = P(p);
      if (k === 0) ctx.moveTo(vp.x(sx), vp.y(sy));
      else ctx.lineTo(vp.x(sx), vp.y(sy));
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function draw3(
  ctx: CanvasRenderingContext2D, width: number, height: number, pal: Palette, d: Samples,
  mode: 'cloud' | 'svd', pca: ReturnType<typeof principalAxes3> | null, zScale: number, view: { az: number; el: number },
) {
  const cam = camera(view.az, view.el);
  const vp = makeViewport(width, height, { x: [-VIEW_R, VIEW_R], y: [-VIEW_R, VIEW_R] }, { l: 8, r: 8, t: 8, b: 8 }, true);
  const P = (p: Vec) => project(cam, p);
  const count = d.T.length;
  let pts: P3[];
  let names: [string, string, string];
  let F: ReturnType<typeof fitter>;
  if (mode === 'cloud' || !pca) {
    F = fitter([d.X[0]!, d.X[1]!, d.X[2]!], d.T, 1);
    pts = Array.from({ length: count }, (_, s) => [F.W(d.X[0]![s]!, 0), F.W(d.X[1]![s]!, 1), F.W(d.X[2]![s]!, 2)]);
    names = ['x', 'y', 'z'];
  } else {
    // coordinates along the two largest singular vectors, T as height
    const c1 = new Float64Array(count), c2 = new Float64Array(count);
    for (let s = 0; s < count; s++) {
      const q = [0, 1, 2].map((i) => d.X[i]![s]! - pca.mean[i]!);
      c1[s] = q[0]! * pca.axes[0]![0] + q[1]! * pca.axes[0]![1] + q[2]! * pca.axes[0]![2];
      c2[s] = q[0]! * pca.axes[1]![0] + q[1]! * pca.axes[1]![1] + q[2]! * pca.axes[1]![2];
    }
    F = fitter([c1, c2], d.T, zScale);
    pts = Array.from({ length: count }, (_, s) => [F.W(c1[s]!, 0), F.W(c2[s]!, 1), F.Z(d.T[s]!)]);
    names = ['v₁', 'v₂', 'T'];
  }
  const ext = [0, 1, 2].map((i) => {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) if (Number.isFinite(p[i])) { lo = Math.min(lo, p[i]!); hi = Math.max(hi, p[i]!); }
    return [lo, hi] as [number, number];
  });
  box(ctx, vp, pal, P, F, ext[0]!, ext[1]!, ext[2]![0], [names[0], names[1]], ext[2]![1], names[2]);

  const order = pts.map((p, s) => ({ s, dep: depth(cam, p) })).filter(({ s }) => finite(...pts[s]!, d.T[s]!));
  order.sort((a, b) => a.dep - b.dep);
  const [dlo, dhi] = order.length ? [order[0]!.dep, order[order.length - 1]!.dep] : [0, 1];
  const r = Math.max(1.6, Math.min(4, 60 / Math.cbrt(count) / 2.2));
  for (const { s, dep } of order) {
    const c = colormap(pal, (d.T[s]! - F.t0) / (F.t1 - F.t0));
    const near = (dep - dlo) / (dhi - dlo || 1);
    const [sx, sy] = P(pts[s]!);
    ctx.fillStyle = rgb(c, 0.6 + 0.45 * near);
    ctx.beginPath();
    ctx.arc(vp.x(sx), vp.y(sy), r * (0.8 + 0.4 * near), 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** Wire box around the plot with axis names. */
function box(
  ctx: CanvasRenderingContext2D,
  vp: ReturnType<typeof makeViewport>,
  pal: Palette,
  P: (p: Vec) => [number, number],
  F: ReturnType<typeof fitter>,
  xr: [number, number],
  yr: [number, number],
  z0: number,
  names: [string, string],
  z1 = F.Z(F.t1),
  zName = 'T',
) {
  const xs = xr, ys = yr, zs = [z0, z1];
  for (const y of ys) for (const z of zs) polyline(ctx, vp, [P([xs[0], y, z]), P([xs[1], y, z])], pal.grid, 1);
  for (const x of xs) for (const z of zs) polyline(ctx, vp, [P([x, ys[0], z]), P([x, ys[1], z])], pal.grid, 1);
  for (const x of xs) for (const y of ys) polyline(ctx, vp, [P([x, y, zs[0]!]), P([x, y, zs[1]!])], pal.grid, 1);
  label(ctx, vp, P([xs[1], ys[0], z0]), names[0], pal.muted, 4, 12);
  label(ctx, vp, P([xs[0], ys[1], z0]), names[1], pal.muted, 4, 12);
  label(ctx, vp, P([xs[0], ys[0], z1]), zName, pal.muted, 4, -2);
}
