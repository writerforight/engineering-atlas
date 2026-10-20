import { useCallback, useRef, useState } from 'react';
import { expSeries, maxAbsDiff, mulVec, norm3, rodrigues, scale, skew3, skewPower, type Mat, type Vec } from '../../core/math';
import {
  Canvas,
  Slider,
  Tex,
  arrow,
  camera,
  fmt,
  label,
  makeViewport,
  polyline,
  project,
  texMatrix,
  useAnimatedTime,
  type CanvasPointer,
  type DrawContext,
  type Palette,
  type Viewport,
} from '../../core/ui';

const VIEW_R = 3.2;
const LATTICE = [-1.5, -0.75, 0, 0.75, 1.5];
const V_LIMIT = 3;
const T_MAX = 2 * Math.PI;
const MAX_TERMS = 12;
const TERMS = Array.from({ length: MAX_TERMS + 1 }, (_, i) => i);

function viewport(width: number, height: number): Viewport {
  return makeViewport(width, height, { x: [-VIEW_R, VIEW_R], y: [-VIEW_R, VIEW_R] }, { l: 8, r: 8, t: 8, b: 8 }, true);
}

const clampV = (x: number) => Math.max(-V_LIMIT, Math.min(V_LIMIT, x));

function det3(A: Mat): number {
  const [a, b, c] = A as [number[], number[], number[]];
  return (
    a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) -
    a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) +
    a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)
  );
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function NumberInput({ value, onChange, name }: { value: number; onChange: (x: number) => void; name: string }) {
  return (
    <label style={{ display: 'grid', fontSize: 12, color: 'var(--muted)' }}>
      {name}
      <input
        type="number"
        step={0.1}
        min={-V_LIMIT}
        max={V_LIMIT}
        value={Number(value.toFixed(2))}
        onChange={(e) => {
          const x = e.target.value === '' ? 0 : Number(e.target.value);
          if (Number.isFinite(x)) onChange(clampV(x));
        }}
        style={{
          width: 76,
          font: 'inherit',
          fontSize: 15,
          padding: '4px 6px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-elev)',
          color: 'var(--fg)',
        }}
      />
    </label>
  );
}

export default function Viz() {
  const [v, setV] = useState<Vec>([0, 0, 1]);
  const [omega, setOmega] = useState(1);
  const [N, setN] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useAnimatedTime(playing, 0.6, T_MAX);
  const [view, setView] = useState({ az: 0.75, el: 0.5 });
  const drag = useRef<{ mode: 'tip' | 'cam'; x: number; y: number; az: number; el: number; v: Vec } | null>(null);

  const s = omega * t;
  const V = skew3(v);
  const theta = norm3(v) * s;
  // S_N = sum_{n=0}^{N} (s V)^n / n!
  const S = expSeries(V, s, N + 1);
  const term = scale(skewPower(v, N), s ** N / factorial(N));
  const R = rodrigues(v, s);
  const err = maxAbsDiff(S, R);

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const cam = camera(view.az, view.el);
      const vp = viewport(width, height);
      drawScene(ctx, vp, pal, (p: Vec) => project(cam, p), v, S);
    },
    [view, v, S],
  );

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      const cam = camera(view.az, view.el);
      const vp = viewport(p.width, p.height);
      if (p.type === 'down') {
        const [tx, ty] = project(cam, v);
        const near = Math.hypot(vp.x(tx) - p.x, vp.y(ty) - p.y) < 22;
        drag.current = { mode: near ? 'tip' : 'cam', x: p.x, y: p.y, az: view.az, el: view.el, v };
        return;
      }
      if (p.type === 'up') {
        drag.current = null;
        return;
      }
      const d = drag.current;
      if (!d || !p.buttons) return;
      if (d.mode === 'cam') {
        setView({ az: d.az - (p.x - d.x) * 0.01, el: Math.max(-1.45, Math.min(1.45, d.el + (p.y - d.y) * 0.01)) });
      } else {
        // Move the tip within the screen plane: screen deltas -> world units along camera right/up.
        const dx = vp.x.invert(p.x) - vp.x.invert(d.x);
        const dy = vp.y.invert(p.y) - vp.y.invert(d.y);
        setV(d.v.map((c, i) => clampV(c + dx * cam.right[i]! + dy * cam.up[i]!)));
      }
    },
    [view, v],
  );

  return (
    <div className="controls">
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.9} maxHeight={640} onPointer={onPointer} ariaLabel="3B ızgara uzay ve v vektörü; v'nin ucunu sürükle, boş yeri sürükleyince kamera döner" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <i style={{ background: 'var(--c2)' }} />v (ucundan tut, sürükle)
            </span>
            <span>
              <i style={{ background: 'var(--c1)' }} />x yönlü çizgiler
            </span>
            <span>
              <i style={{ background: 'var(--c3)' }} />y yönlü
            </span>
            <span>
              <i style={{ background: 'var(--c4)' }} />z yönlü
            </span>
          </div>
          <p className="canvas-caption">
            Soluk ızgara orijinal uzay, renkli ızgara ilk {N + 1} terimin toplamı <Tex tex={`S_{${N}}`} /> uygulanmış hâli.
          </p>
        </div>
        <div className="panel controls">
          <div className="row" style={{ gap: 8, alignItems: 'end' }}>
            <Tex tex="v=" />
            {['v_x', 'v_y', 'v_z'].map((name, i) => (
              <NumberInput key={name} name={name} value={v[i]!} onChange={(x) => setV(v.map((c, j) => (j === i ? x : c)))} />
            ))}
          </div>
          <Slider label={<Tex tex="\omega" />} value={omega} min={-3} max={3} onChange={setOmega} />
          <Slider label={<Tex tex="t" />} value={t} min={0} max={T_MAX} onChange={setT} />
          <div className="row">
            <button className="btn" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
              {playing ? 'Durdur' : 't’yi oynat'}
            </button>
          </div>
          <div className="row">
            <span style={{ fontSize: 14 }}>
              Son terim <Tex tex="N" />:
            </span>
            {TERMS.map((n) => (
              <button key={n} className="btn" aria-pressed={N === n} onClick={() => setN(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="readout">
            <Tex block tex={`V=[v]_\\times=${texMatrix(V, 2)},\\qquad \\omega t=${fmt(s, 3)}`} />
            <Tex block tex={`S_{${N}}=\\sum_{n=0}^{${N}}\\frac{(\\omega t)^n}{n!}V^n`} />
            <Tex block tex={`\\text{eklenen terim: }\\frac{(\\omega t)^{${N}}}{${N}!}V^{${N}}=${texMatrix(term, 2)}`} />
            <Tex block tex={`S_{${N}}=${texMatrix(S, 2)}`} />
            <Tex block tex={`e^{V\\omega t}=${texMatrix(R, 2)},\\qquad \\theta=|v|\\,\\omega t=${fmt(theta, 3)}`} />
            <p style={{ margin: 0 }}>
              <Tex tex={`\\max|S_{${N}}-e^{V\\omega t}|=${fmt(err, 3)}`} />, <Tex tex={`\\det S_{${N}}=${fmt(det3(S), 3)}`} />
              {err < 1e-3 ? ' → toplam dönmeye yakınsadı.' : ' → henüz dönme değil: uzay hâlâ esniyor.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  pal: Palette,
  P: (p: Vec) => [number, number],
  v: Vec,
  A: Mat,
) {
  const lo = LATTICE[0]!;
  const hi = LATTICE[LATTICE.length - 1]!;

  // Undeformed lattice (faint), then the bent one: a linear map keeps lines straight,
  // so two endpoints per line are enough.
  const families: Array<{ color: string; seg: (p: number, q: number) => [Vec, Vec] }> = [
    { color: pal.c1, seg: (p, q) => [[lo, p, q], [hi, p, q]] },
    { color: pal.c3, seg: (p, q) => [[p, lo, q], [p, hi, q]] },
    { color: pal.c4, seg: (p, q) => [[p, q, lo], [p, q, hi]] },
  ];
  for (const f of families) {
    for (const p of LATTICE) {
      for (const q of LATTICE) {
        const [s0, s1] = f.seg(p, q);
        polyline(ctx, vp, [P(s0), P(s1)], pal.grid, 1);
      }
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (const f of families) {
    for (const p of LATTICE) {
      for (const q of LATTICE) {
        const [s0, s1] = f.seg(p, q);
        polyline(ctx, vp, [P(mulVec(A, s0)), P(mulVec(A, s1))], f.color, 1.4);
      }
    }
  }
  ctx.restore();

  const axes: Array<[Vec, string]> = [
    [[1, 0, 0], 'x'],
    [[0, 1, 0], 'y'],
    [[0, 0, 1], 'z'],
  ];
  for (const [e, name] of axes) {
    const tip = e.map((c) => c * 2.6);
    polyline(ctx, vp, [P([0, 0, 0]), P(tip)], pal.axis, 1);
    label(ctx, vp, P(tip), name, pal.muted, 4, -2);
  }

  // The vector v (rotation axis) with a grab handle at its tip.
  const n = norm3(v);
  if (n > 0) {
    const ext = v.map((c) => (c / n) * VIEW_R);
    polyline(ctx, vp, [P(ext.map((c) => -c)), P(ext)], pal.c2, 1, [4, 4]);
  }
  arrow(ctx, vp, [0, 0], P(v), pal.c2, 3);
  const tip = P(v);
  ctx.save();
  ctx.strokeStyle = pal.c2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(vp.x(tip[0]), vp.y(tip[1]), 9, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  label(ctx, vp, tip, 'v', pal.c2, 12, -8);
}
