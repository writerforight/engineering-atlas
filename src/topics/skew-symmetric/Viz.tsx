import { useCallback, useRef, useState } from 'react';
import { add, identity, mulVec, norm3, scale, skew3, skewPower, type Mat, type Vec } from '../../core/math';
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
  prefersReducedMotion,
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
const W_LIMIT = 3;
const POWERS = [0, 1, 2, 3, 4, 5, 6];
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];

function viewport(width: number, height: number): Viewport {
  return makeViewport(width, height, { x: [-VIEW_R, VIEW_R], y: [-VIEW_R, VIEW_R] }, { l: 8, r: 8, t: 8, b: 8 }, true);
}

const clampW = (x: number) => Math.max(-W_LIMIT, Math.min(W_LIMIT, x));

/** What [w]x^k does to space, in words. */
function effectText(k: number, n: number): string {
  if (k === 0) return 'k = 0: birim matris, uzay olduğu gibi kalır.';
  if (n === 0) return 'ω = 0: matris sıfır, bütün uzay orijine çöker.';
  const turns = ['90°', '180°', '270°', '360°'][(k - 1) % 4];
  return `ω doğrultusu sıfıra ezilir, uzay ω’ya dik düzleme yassılır; o düzlemde ${turns} döner (90° × ${k}) ve |ω|${SUP[k]} = ${fmt(n ** k, 3)} ile ölçeklenir.`;
}

function powerTex(k: number, n: number): string {
  if (k === 0) return 'I';
  const half = Math.floor((k - 1) / 2);
  const coef = (-1) ** half * n ** (2 * half);
  const base = k % 2 === 1 ? '[\\omega]_\\times' : '[\\omega]_\\times^2';
  return half === 0 ? base : `${fmt(coef, 3)}\\,${base}`;
}

function NumberInput({ value, onChange, name }: { value: number; onChange: (x: number) => void; name: string }) {
  return (
    <label style={{ display: 'grid', fontSize: 12, color: 'var(--muted)' }}>
      {name}
      <input
        type="number"
        step={0.1}
        min={-W_LIMIT}
        max={W_LIMIT}
        value={Number(value.toFixed(2))}
        onChange={(e) => {
          const x = e.target.value === '' ? 0 : Number(e.target.value);
          if (Number.isFinite(x)) onChange(clampW(x));
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
  const [w, setW] = useState<Vec>([0, 0, 1]);
  const [k, setK] = useState(1);
  const [normalize, setNormalize] = useState(true);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  // Morph phase: s runs 0 -> 1 -> 0 so space bends from I to the chosen power and back.
  const [phase, setPhase] = useAnimatedTime(playing, 0.35, 2);
  const s = phase <= 1 ? phase : 2 - phase;
  const [view, setView] = useState({ az: 0.75, el: 0.5 });
  const drag = useRef<{ mode: 'tip' | 'cam'; x: number; y: number; az: number; el: number; w: Vec } | null>(null);

  const n = norm3(w);
  const K = skew3(w);
  const Kk = skewPower(w, k);
  const target = normalize && n > 0 && k > 0 ? scale(Kk, 1 / n ** k) : Kk;
  const A: Mat = add(scale(identity(3), 1 - s), scale(target, s));

  const draw = useCallback(
    ({ ctx, width, height, palette: pal }: DrawContext) => {
      const cam = camera(view.az, view.el);
      const vp = viewport(width, height);
      const P = (p: Vec) => project(cam, p);
      drawScene(ctx, vp, pal, P, w, n, k, A);
    },
    [view, w, n, k, A],
  );

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      const cam = camera(view.az, view.el);
      const vp = viewport(p.width, p.height);
      if (p.type === 'down') {
        const [tx, ty] = project(cam, w);
        const near = Math.hypot(vp.x(tx) - p.x, vp.y(ty) - p.y) < 22;
        drag.current = { mode: near ? 'tip' : 'cam', x: p.x, y: p.y, az: view.az, el: view.el, w };
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
        setW(d.w.map((c, i) => clampW(c + dx * cam.right[i]! + dy * cam.up[i]!)));
      }
    },
    [view, w],
  );

  return (
    <div className="controls">
      <div className="viz-grid">
        <div className="panel">
          <Canvas draw={draw} aspect={0.9} maxHeight={640} onPointer={onPointer} ariaLabel="3B ızgara uzay ve ω vektörü; ω'nun ucunu sürükle, boş yeri sürükleyince kamera döner" />
          <div className="legend" style={{ marginTop: 8 }}>
            <span>
              <i style={{ background: 'var(--c2)' }} />ω (ucundan tut, sürükle)
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
            Turuncu ucu sürükle: ω’yu çiz. Boş yeri sürükle: kamerayı döndür. Gri disk, ω’ya dik düzlem.
          </p>
        </div>
        <div className="panel controls">
          <div className="row" style={{ gap: 8, alignItems: 'end' }}>
            <Tex tex="\omega=" />
            {['ω_x', 'ω_y', 'ω_z'].map((name, i) => (
              <NumberInput key={name} name={name} value={w[i]!} onChange={(x) => setW(w.map((c, j) => (j === i ? x : c)))} />
            ))}
          </div>
          <div className="row">
            <span style={{ fontSize: 14 }}>
              Kuvvet <Tex tex="k" />:
            </span>
            {POWERS.map((p) => (
              <button key={p} className="btn" aria-pressed={k === p} onClick={() => setK(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn" aria-pressed={playing} onClick={() => setPlaying((x) => !x)}>
              {playing ? '❚❚ Durdur' : '▶ Bük'}
            </button>
            <div style={{ flex: '1 1 160px' }}>
              <Slider
                label={
                  <>
                    bükülme <Tex tex="s" />
                  </>
                }
                value={s}
                min={0}
                max={1}
                onChange={(x) => {
                  setPlaying(false);
                  setPhase(x);
                }}
              />
            </div>
          </div>
          <label className="row" style={{ fontSize: 14 }}>
            <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />
            <Tex tex="|\omega|^k" /> ile normalize et (sadece şekle bak)
          </label>
          <div className="readout">
            <Tex block tex={`[\\omega]_\\times=${texMatrix(K, 2)}`} />
            <Tex block tex={`[\\omega]_\\times^{${k}}=${texMatrix(Kk, 2)}=${powerTex(k, n)}`} />
            <Tex block tex={`x\\;\\mapsto\\;\\big((1-s)\\,I+s\\,[\\omega]_\\times^{${k}}${normalize && k > 0 ? `/|\\omega|^{${k}}` : ''}\\big)\\,x`} />
            <p style={{ margin: 0 }}>{effectText(k, n)}</p>
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
  w: Vec,
  n: number,
  k: number,
  A: Mat,
) {
  const lo = LATTICE[0]!;
  const hi = LATTICE[LATTICE.length - 1]!;

  // Plane perpendicular to w (where every power k >= 1 maps space).
  if (n > 0 && k > 0) {
    const u = Math.abs(w[0]!) < 0.9 * n ? [1, 0, 0] : [0, 1, 0];
    const wh = w.map((c) => c / n);
    const d = u[0]! * wh[0]! + u[1]! * wh[1]! + u[2]! * wh[2]!;
    const e1 = u.map((c, i) => c - d * wh[i]!);
    const l1 = norm3(e1);
    const a = e1.map((c) => c / l1);
    const b = [wh[1]! * a[2]! - wh[2]! * a[1]!, wh[2]! * a[0]! - wh[0]! * a[2]!, wh[0]! * a[1]! - wh[1]! * a[0]!];
    ctx.save();
    ctx.fillStyle = pal.muted;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    for (let j = 0; j <= 64; j++) {
      const th = (2 * Math.PI * j) / 64;
      const q = P(a.map((c, i) => 2.4 * (Math.cos(th) * c + Math.sin(th) * b[i]!)));
      if (j === 0) ctx.moveTo(vp.x(q[0]), vp.y(q[1]));
      else ctx.lineTo(vp.x(q[0]), vp.y(q[1]));
    }
    ctx.fill();
    ctx.restore();
  }

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

  // Coordinate axes and the image of the basis vectors.
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

  // The vector w with a grab handle at its tip.
  if (n > 0) {
    const ext = w.map((c) => (c / n) * VIEW_R);
    polyline(ctx, vp, [P(ext.map((c) => -c)), P(ext)], pal.c2, 1, [4, 4]);
  }
  arrow(ctx, vp, [0, 0], P(w), pal.c2, 3);
  const tip = P(w);
  ctx.save();
  ctx.strokeStyle = pal.c2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(vp.x(tip[0]), vp.y(tip[1]), 9, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  label(ctx, vp, tip, 'ω', pal.c2, 12, -8);
}
