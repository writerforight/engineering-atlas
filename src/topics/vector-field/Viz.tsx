import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  SYSTEMS, cartesianField, circleFlux, circlePoint, circulation, compile, curl, divergence, ExprError, spherePoint,
  sphereFlux, type CartField, type Compiled, type CoordSystem, type Sweep, type SystemId, type Vec,
} from '../../core/math';
import {
  Canvas, Slider, Tex, arrow, camera, depth, dot, drawGridAxes, fmt, label, makeViewport, polyline, project,
  useAnimatedTime, useHashParam, type CanvasPointer, type DrawContext, type Viewport,
} from '../../core/ui';

const TAU = 2 * Math.PI;
const L2 = 3; // half-width of the 2D window
const L3 = 2; // half-width of the 3D box
const VIEW3 = 3.1;

interface Preset {
  name: string;
  f: string[];
}

const SYSTEM_UI: Record<SystemId, { name: string; unit: string[]; p0: number[]; presets: Preset[] }> = {
  cart2: {
    name: 'Kartezyen (x, y)', unit: ['eₓ', 'e_y'], p0: [1, 0.5],
    presets: [
      { name: 'Kaynak', f: ['x', 'y'] },
      { name: 'Girdap', f: ['-y', 'x'] },
      { name: 'Kayma akışı', f: ['y', '0'] },
      { name: 'Eyer', f: ['x', '-y'] },
      { name: 'Dalgalı', f: ['sin(y)', 'sin(x)'] },
    ],
  },
  polar: {
    name: 'Kutupsal (r, φ)', unit: ['e_r', 'e_φ'], p0: [1.2, 0.6],
    presets: [
      { name: 'Çizgi kaynağı 1/r', f: ['1/r', '0'] },
      { name: 'Katı dönme', f: ['0', 'r'] },
      { name: 'Potansiyel girdabı', f: ['0', '1/r'] },
      { name: 'Sarmal gider', f: ['-1/r', '1/r'] },
      { name: 'Açıya bağlı', f: ['cos(phi)', 'r sin(phi)'] },
    ],
  },
  cart3: {
    name: 'Kartezyen (x, y, z)', unit: ['eₓ', 'e_y', 'e_z'], p0: [0.8, 0.5, 0.3],
    presets: [
      { name: 'Kaynak', f: ['x', 'y', 'z'] },
      { name: 'z çevresinde dönme', f: ['-y', 'x', '0'] },
      { name: 'Kayma akışı', f: ['0', '0', 'x'] },
      { name: 'grad(xyz)', f: ['y z', 'x z', 'x y'] },
    ],
  },
  cyl: {
    name: 'Silindirik (r, φ, z)', unit: ['e_r', 'e_φ', 'e_z'], p0: [1, 0.8, 0.3],
    presets: [
      { name: 'Akım taşıyan tel', f: ['0', '1/r', '0'] },
      { name: 'Katı dönme', f: ['0', 'r', '0'] },
      { name: 'Radyal giriş, eksenel çıkış', f: ['-r', '0', '2z'] },
      { name: 'Helis', f: ['0', 'r', '1'] },
    ],
  },
  sph: {
    name: 'Küresel (r, ϑ, φ)', unit: ['e_r', 'e_ϑ', 'e_φ'], p0: [1.2, 1.1, 0.7],
    presets: [
      { name: 'Nokta yük 1/r²', f: ['1/r^2', '0', '0'] },
      { name: 'Düzgün genişleme', f: ['r', '0', '0'] },
      { name: 'z çevresinde dönme', f: ['0', '0', 'r sin(theta)'] },
      { name: 'Dipol', f: ['2cos(theta)/r^3', 'sin(theta)/r^3', '0'] },
    ],
  },
};

const SYSTEM_IDS: SystemId[] = ['cart2', 'polar', 'cart3', 'cyl', 'sph'];

type NormalChoice = 'x' | 'y' | 'z' | 'rot';
const AXES: Record<'x' | 'y' | 'z', Vec> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

const greek = (s: string) => s.replace(/[φϕ]/g, 'phi').replace(/[θϑ]/g, 'theta');
function tryCompile(src: string, allowed: string[]): Compiled | string {
  try {
    return compile(greek(src), allowed);
  } catch (e) {
    return e instanceof ExprError ? e.message : String(e);
  }
}

const finite = (v: Vec) => v.every(Number.isFinite);
const vdot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i]!, 0);
const add = (a: Vec, b: Vec, k = 1) => a.map((v, i) => v + k * b[i]!);
const num = (v: number, d = 3) => (Number.isFinite(v) ? fmt(v, d) : '\\text{tanımsız}');

interface Scene {
  sys: CoordSystem;
  F: CartField;
  q: Vec;
  pc: Vec;
  R: number;
  n: Vec;
  flux: Sweep;
  circ: Sweep;
}

/** Arrow length for a field magnitude: square-root compressed, capped at maxLen. */
function lengthScale(mags: number[], maxLen: number) {
  const s = mags.filter((m) => Number.isFinite(m)).sort((a, b) => a - b);
  const ref = s.length ? s[Math.floor(0.9 * (s.length - 1))]! || s[s.length - 1]! || 1 : 1;
  return (m: number) => maxLen * Math.min(1, Math.sqrt(m / ref));
}

function withAlpha(ctx: CanvasRenderingContext2D, a: number, f: () => void) {
  const old = ctx.globalAlpha;
  ctx.globalAlpha = a;
  f();
  ctx.globalAlpha = old;
}

function viewport2(width: number, height: number): Viewport {
  return makeViewport(width, height, { x: [-L2, L2], y: [-L2, L2] }, undefined, true);
}

function draw2(d: DrawContext, sc: Scene, sweep: number, density: number, unit: string[]) {
  const { ctx, width, height, palette: pal } = d;
  const vp = viewport2(width, height);
  drawGridAxes(ctx, vp, pal);
  const cell = (2 * L2) / density;
  const x0 = Math.ceil(vp.x.invert(vp.left) / cell) * cell, x1 = vp.x.invert(vp.right);

  // field arrows on a Cartesian grid, whatever the coordinate system
  const pts: { x: Vec; v: Vec; m: number }[] = [];
  for (let x = x0; x <= x1; x += cell)
    for (let y = -L2 + cell / 2; y < L2; y += cell) {
      const v = sc.F([x, y]);
      if (finite(v)) pts.push({ x: [x, y], v, m: Math.hypot(...v) });
    }
  const len = lengthScale(pts.map((p) => p.m), cell * 0.92);
  for (const p of pts) {
    if (p.m === 0) continue;
    const h = p.v.map((c) => ((c / p.m) * len(p.m)) / 2);
    withAlpha(ctx, 0.35 + 0.6 * (len(p.m) / (cell * 0.92)), () =>
      arrow(ctx, vp, [p.x[0]! - h[0]!, p.x[1]! - h[1]!], [p.x[0]! + h[0]!, p.x[1]! + h[1]!], pal.muted, 1.4));
  }

  // circle, swept arc, flux bars on the swept part
  const ring = (a0: number, a1: number) => {
    const out: [number, number][] = [];
    for (let k = 0; k <= 120; k++) {
      const { x } = circlePoint(sc.pc, sc.R, a0 + ((a1 - a0) * k) / 120);
      out.push([x[0]!, x[1]!]);
    }
    return out;
  };
  polyline(ctx, vp, ring(0, TAU), pal.fg, 1.2);
  const K = 72;
  for (let k = 0; k < K; k++) {
    const a = (TAU * (k + 0.5)) / K;
    if (a > TAU * sweep) break;
    const { x, out } = circlePoint(sc.pc, sc.R, a);
    const fn = vdot(sc.F(x), out);
    if (!Number.isFinite(fn) || fn === 0) continue;
    const e = add(x, out, Math.sign(fn) * len(Math.abs(fn)) * 0.9);
    polyline(ctx, vp, [[x[0]!, x[1]!], [e[0]!, e[1]!]], fn > 0 ? pal.c1 : pal.c2, 2);
  }
  polyline(ctx, vp, ring(0, TAU * sweep), pal.c3, 3.5);

  // local unit vectors at P
  sc.sys.basis(sc.q).forEach((e, i) => {
    const tip = add(sc.pc, e, 0.6);
    arrow(ctx, vp, [sc.pc[0]!, sc.pc[1]!], [tip[0]!, tip[1]!], pal.c4, 2);
    label(ctx, vp, [tip[0]!, tip[1]!], unit[i]!, pal.c4, 5, -3);
  });
  dot(ctx, vp, [sc.pc[0]!, sc.pc[1]!], pal.fg, 5);
  label(ctx, vp, [sc.pc[0]!, sc.pc[1]!], 'P', pal.fg, -16, -6);

  // moving point: F split into normal and tangential parts
  if (sweep < 1) {
    const { x, out, t } = circlePoint(sc.pc, sc.R, TAU * sweep);
    const f = sc.F(x);
    if (finite(f)) {
      const m = Math.hypot(...f) || 1, k = len(m) / m * 1.6;
      const at = (v: Vec, s: number): [number, number] => [x[0]! + v[0]! * s, x[1]! + v[1]! * s];
      arrow(ctx, vp, at(f, 0), at(out, vdot(f, out) * k), vdot(f, out) > 0 ? pal.c1 : pal.c2, 2.5);
      arrow(ctx, vp, at(f, 0), at(t, vdot(f, t) * k), pal.c3, 2.5);
      arrow(ctx, vp, at(f, 0), at(f, k), pal.fg, 2);
    }
    dot(ctx, vp, [x[0]!, x[1]!], pal.fg, 4);
  }
}

function draw3(d: DrawContext, sc: Scene, sweep: number, density: number, unit: string[], view: { az: number; el: number }) {
  const { ctx, width, height, palette: pal } = d;
  const cam = camera(view.az, view.el);
  const vp = makeViewport(width, height, { x: [-VIEW3, VIEW3], y: [-VIEW3, VIEW3] }, { l: 8, r: 8, t: 8, b: 8 }, true);
  const P = (p: Vec) => project(cam, p);
  const arrow3 = (a: Vec, b: Vec, color: string, w = 2) => arrow(ctx, vp, P(a), P(b), color, w);

  (['x', 'y', 'z'] as const).forEach((nm, i) => {
    const e = AXES[nm];
    polyline(ctx, vp, [P(e.map((c) => -c * L3 * 1.15)), P(e.map((c) => c * L3 * 1.15))], pal.axis, 1);
    label(ctx, vp, P(e.map((c) => c * L3 * 1.22)), nm, pal.muted, 2, 4 - i);
  });

  // field arrows, far to near
  const cell = (2 * L3) / density;
  const pts: { x: Vec; v: Vec; m: number; dep: number }[] = [];
  for (let i = 0; i < density; i++)
    for (let j = 0; j < density; j++)
      for (let k = 0; k < density; k++) {
        const x = [i, j, k].map((c) => -L3 + cell * (c + 0.5));
        const v = sc.F(x);
        if (finite(v)) pts.push({ x, v, m: Math.hypot(...v), dep: depth(cam, x) });
      }
  pts.sort((a, b) => a.dep - b.dep);
  const len = lengthScale(pts.map((p) => p.m), cell * 0.9);
  const dSpan = L3 * 1.75;
  for (const p of pts) {
    if (p.m === 0) continue;
    const h = p.v.map((c) => ((c / p.m) * len(p.m)) / 2);
    withAlpha(ctx, 0.2 + 0.6 * Math.min(1, Math.max(0, (p.dep + dSpan) / (2 * dSpan))), () =>
      arrow3(add(p.x, h, -1), add(p.x, h), pal.muted, 1.3));
  }

  // sphere outline and flux dots on the swept cap (pole = n)
  const c = P(sc.pc);
  const sil: [number, number][] = [];
  for (let k = 0; k <= 96; k++) sil.push([c[0] + sc.R * Math.cos((TAU * k) / 96), c[1] + sc.R * Math.sin((TAU * k) / 96)]);
  polyline(ctx, vp, sil, pal.fg, 1.2);
  const NA = 16;
  for (let i = 0; i < NA; i++) {
    const a = (Math.PI * (i + 0.5)) / NA;
    if (a > Math.PI * sweep) break;
    const nb = Math.max(4, Math.round(2 * NA * Math.sin(a)));
    for (let j = 0; j < nb; j++) {
      const { x, out } = spherePoint(sc.pc, sc.R, a, (TAU * (j + 0.5)) / nb, sc.n);
      const fn = vdot(sc.F(x), out);
      if (!Number.isFinite(fn) || fn === 0) continue;
      const front = vdot(out, cam.toViewer) > 0;
      withAlpha(ctx, front ? 0.9 : 0.22, () => dot(ctx, vp, P(x), fn > 0 ? pal.c1 : pal.c2, 1.4 + 3.2 * (len(Math.abs(fn)) / (cell * 0.9))));
    }
  }

  // circulation loop (right-handed about n), swept part, normal
  const loop = (a1: number) => {
    const out: [number, number][] = [];
    for (let k = 0; k <= 120; k++) out.push(P(circlePoint(sc.pc, sc.R, (a1 * k) / 120, sc.n).x));
    return out;
  };
  polyline(ctx, vp, loop(TAU), pal.fg, 1.2, [4, 3]);
  polyline(ctx, vp, loop(TAU * sweep), pal.c3, 3.5);
  const nTip = add(sc.pc, sc.n, sc.R + 0.45);
  arrow3(sc.pc, nTip, pal.c3, 2);
  label(ctx, vp, P(nTip), 'n', pal.c3, 5, -3);

  sc.sys.basis(sc.q).forEach((e, i) => {
    const tip = add(sc.pc, e, 0.6);
    arrow3(sc.pc, tip, pal.c4, 2);
    label(ctx, vp, P(tip), unit[i]!, pal.c4, 5, -3);
  });
  dot(ctx, vp, c, pal.fg, 5);
  label(ctx, vp, c, 'P', pal.fg, -16, -6);

  if (sweep < 1) {
    const { x, t } = circlePoint(sc.pc, sc.R, TAU * sweep, sc.n);
    const f = sc.F(x);
    if (finite(f)) {
      const m = Math.hypot(...f) || 1, k = (len(m) / m) * 1.6;
      arrow3(x, add(x, t, vdot(f, t) * k), pal.c3, 2.5);
      arrow3(x, add(x, f, k), pal.fg, 2);
    }
    dot(ctx, vp, P(x), pal.fg, 4);
  }
}

/** Integrands dΦ/dτ and dΓ/dτ over the sweep; the filled area up to τ is the running integral. */
function drawSweep(d: DrawContext, flux: Sweep, circ: Sweep, sweep: number) {
  const { ctx, width, height, palette: pal } = d;
  let hi = 1e-9;
  for (const s of [flux, circ]) for (const v of s.w) if (Number.isFinite(v)) hi = Math.max(hi, Math.abs(v));
  const vp = makeViewport(width, height, { x: [0, 1], y: [-hi * 1.1, hi * 1.1] });
  drawGridAxes(ctx, vp, pal, { xLabel: 'tarama τ' });
  for (const [s, color] of [[flux, pal.c1], [circ, pal.c3]] as const) {
    const N = s.w.length;
    const pts: [number, number][] = Array.from(s.w, (v, i) => [(i + 0.5) / N, v]);
    const upto = pts.filter(([x, y]) => x <= sweep && Number.isFinite(y));
    if (upto.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(vp.x(upto[0]![0]), vp.y(0));
      for (const [x, y] of upto) ctx.lineTo(vp.x(x), vp.y(y));
      ctx.lineTo(vp.x(upto[upto.length - 1]![0]), vp.y(0));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    polyline(ctx, vp, pts, color, 2);
  }
  polyline(ctx, vp, [[sweep, -hi * 1.1], [sweep, hi * 1.1]], pal.fg, 1, [3, 3]);
}

const partial = (s: Sweep, sweep: number) => {
  const k = Math.floor(sweep * s.cum.length + 1e-9);
  return k <= 0 ? 0 : s.cum[Math.min(k, s.cum.length) - 1]!;
};

export default function Viz() {
  const [sysId, setSysId] = useHashParam<SystemId>('sys', 'polar', SYSTEM_IDS);
  const [f, setF] = useState<string[]>(SYSTEM_UI[sysId].presets[0]!.f);
  const [q, setQ] = useState<number[]>(SYSTEM_UI[sysId].p0);
  const [R, setR] = useState(0.6);
  const [normal, setNormal] = useState<NormalChoice>('z');
  const [density, setDensity] = useState(15);
  const [density3, setDensity3] = useState(5);
  const [view, setView] = useState({ az: -0.9, el: 0.5 });
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [t, setT] = useAnimatedTime(playing, 0.18, 1);
  const drag = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  const sys = SYSTEMS[sysId];
  const ui = SYSTEM_UI[sysId];
  const is3 = sys.dim === 3;
  const sweep = started ? t : 1;

  const chooseSystem = (id: SystemId) => {
    setSysId(id);
    setF(SYSTEM_UI[id].presets[0]!.f);
    setQ(SYSTEM_UI[id].p0);
  };

  const compiled = useMemo(() => f.map((src) => tryCompile(src, sys.params)), [f, sys]);
  const ok = compiled.every((c) => typeof c !== 'string');

  const scene = useMemo<(Scene & { div: number; rot: [number, number, number]; FP: Vec }) | null>(() => {
    if (!ok) return null;
    const comps = (compiled as Compiled[]).map((c) => c.fn as (v: Vec) => number);
    const F = cartesianField(sys, comps);
    const pc = sys.toCart(q);
    const div = divergence(F, pc), rot = curl(F, pc);
    let n: Vec = [0, 0, 1];
    if (is3) n = normal === 'rot' ? (finite(rot) && Math.hypot(...rot) > 1e-9 ? rot.map((c) => c / Math.hypot(...rot)) : [0, 0, 1]) : AXES[normal];
    return {
      sys, F, q, pc, R, n, div, rot,
      FP: comps.map((c) => c(q)),
      flux: is3 ? sphereFlux(F, pc, R, n) : circleFlux(F, pc, R),
      circ: circulation(F, pc, R, is3 ? n : undefined),
    };
  }, [ok, compiled, sys, q, R, normal, is3]);

  const draw = useCallback(
    (d: DrawContext) => {
      if (!scene) {
        d.ctx.fillStyle = d.palette.muted;
        d.ctx.font = '14px system-ui, sans-serif';
        d.ctx.fillText('Formülde hata var: sağdaki kırmızı notlara bak.', 16, 28);
        return;
      }
      if (is3) draw3(d, scene, sweep, density3, ui.unit, view);
      else draw2(d, scene, sweep, density, ui.unit);
    },
    [scene, is3, sweep, density, density3, ui, view],
  );
  const drawStrip = useCallback((d: DrawContext) => { if (scene) drawSweep(d, scene.flux, scene.circ, sweep); }, [scene, sweep]);

  const onPointer = useCallback(
    (p: CanvasPointer) => {
      if (!is3) {
        if (p.type === 'up' || !p.buttons) return;
        const vp = viewport2(p.width, p.height);
        const clamp = (v: number) => Math.max(-L2, Math.min(L2, v));
        const nq = sys.fromCart([clamp(vp.x.invert(p.x)), clamp(vp.y.invert(p.y))]);
        setQ(nq.map((v, i) => Math.max(sys.ranges[i]![0], Math.min(sys.ranges[i]![1], v))));
        return;
      }
      if (p.type === 'down') drag.current = { x: p.x, y: p.y, az: view.az, el: view.el };
      else if (p.type === 'up') drag.current = null;
      else if (drag.current && p.buttons) {
        const g = drag.current;
        setView({ az: g.az - (p.x - g.x) * 0.01, el: Math.max(-1.45, Math.min(1.45, g.el + (p.y - g.y) * 0.01)) });
      }
    },
    [is3, sys, view],
  );

  const pTex = sys.paramTex.join(',');
  const area = Math.PI * R * R;
  const vol = (4 / 3) * Math.PI * R ** 3;
  const rotN = scene ? vdot(scene.rot, scene.n) : NaN;

  return (
    <div className="controls">
      <div className="row">
        <span style={{ fontSize: 14 }}>2B:</span>
        {(['cart2', 'polar'] as SystemId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={sysId === id} onClick={() => chooseSystem(id)}>{SYSTEM_UI[id].name}</button>
        ))}
        <span style={{ fontSize: 14, marginLeft: 8 }}>3B:</span>
        {(['cart3', 'cyl', 'sph'] as SystemId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={sysId === id} onClick={() => chooseSystem(id)}>{SYSTEM_UI[id].name}</button>
        ))}
      </div>

      {scene && (
        <div className="panel" aria-live="off">
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <Tile
              color="var(--fg)"
              title={<>P noktası</>}
              value={<Tex tex={`(${q.map((v) => fmt(v, 2)).join(',\\,')})`} />}
              sub={<Tex tex={`\\mathbf F(P)=${scene.FP.map((c, i) => `(${num(c, 2)})${sys.unitTex[i]}`).join('+')}`} />}
            />
            <Tile
              color="var(--c1)"
              title={<>Diverjans <Tex tex="\nabla\cdot\mathbf F\,(P)" /></>}
              value={<Tex tex={num(scene.div)} />}
              sub={<>P’ye bağlı, R’den bağımsız</>}
            />
            <Tile
              color="var(--c3)"
              title={<>Rotasyon <Tex tex={is3 ? '(\\nabla\\times\\mathbf F)\\cdot\\mathbf n\\,(P)' : '(\\nabla\\times\\mathbf F)_z\\,(P)'} /></>}
              value={<Tex tex={num(is3 ? rotN : scene.rot[2])} />}
              sub={is3 ? <Tex tex={`\\nabla\\times\\mathbf F=(${scene.rot.map((c) => num(c, 2)).join(',\\,')})_{xyz}`} /> : <>P’ye bağlı, R’den bağımsız</>}
            />
            <Tile
              color="var(--c1)"
              title={<>Akı <Tex tex={is3 ? '\\Phi_R=\\oiint\\mathbf F\\cdot\\mathbf n\\,dA' : '\\Phi_R=\\oint\\mathbf F\\cdot\\mathbf n\\,ds'} /></>}
              value={<Tex tex={num(scene.flux.total)} />}
              sub={<Tex tex={is3 ? `\\Phi_R/(\\tfrac43\\pi R^3)=${num(scene.flux.total / vol)}` : `\\Phi_R/(\\pi R^2)=${num(scene.flux.total / area)}`} />}
            />
            <Tile
              color="var(--c3)"
              title={<>Sirkülasyon <Tex tex="\Gamma_R=\oint\mathbf F\cdot d\mathbf l" /></>}
              value={<Tex tex={num(scene.circ.total)} />}
              sub={<Tex tex={`\\Gamma_R/(\\pi R^2)=${num(scene.circ.total / area)}`} />}
            />
          </div>
          <p className="canvas-caption" style={{ marginBottom: 0 }}>
            Bu beş kutu canlıdır: P’yi {is3 ? 'kaydırıcılarla' : 'sürükleyerek ya da kaydırıcılarla'} taşıdığında, R’yi ya da formülü
            değiştirdiğinde anında yeniden hesaplanır. R küçüldükçe <Tex tex={is3 ? '\\Phi_R/V' : '\\Phi_R/A'} /> diverjansa,{' '}
            <Tex tex="\Gamma_R/A" /> {is3 ? 'rotasyonun n bileşenine' : 'rotasyona'} yaklaşır; fark kalıyorsa çemberin/kürenin içinde alanın
            tanımsız olduğu bir nokta (kaynak ya da girdap çizgisi) vardır.
            {sweep < 1 && (
              <>
                {' '}Tarama τ = {fmt(sweep, 2)}: şu ana kadar <Tex tex={`\\Phi(\\tau)=${num(partial(scene.flux, sweep))}`} />,{' '}
                <Tex tex={`\\Gamma(\\tau)=${num(partial(scene.circ, sweep))}`} />.
              </>
            )}
          </p>
        </div>
      )}

      <div className="viz-grid">
        <div className="panel">
          <Canvas
            draw={draw}
            aspect={is3 ? 0.9 : 0.8}
            maxHeight={620}
            onPointer={onPointer}
            ariaLabel={is3 ? '3B vektör alanı; sürükleyince kamera döner' : '2B vektör alanı; tıklayıp sürükleyince P taşınır'}
          />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--c1)' }} /> dışarı akı (F·n &gt; 0)</span>
            <span><i style={{ background: 'var(--c2)' }} /> içeri akı (F·n &lt; 0)</span>
            <span><i style={{ background: 'var(--c3)' }} /> sirkülasyon yolu / teğet bileşen</span>
            <span><i style={{ background: 'var(--c4)' }} /> P’deki birim vektörler</span>
          </div>
          <p className="canvas-caption">
            {is3
              ? 'Sürükle: kamerayı döndür. Küre üzerindeki noktalar F·n (büyüklük = nokta boyu); kesikli çember, n normaline göre sağ el yönünde dolaşılan sirkülasyon yolu.'
              : 'Tıkla ya da sürükle: P’yi taşı. Çemberden çıkan çizgiler F·n (dışarı mavi, içeri turuncu); çember saat yönünün tersine dolaşılır.'}
          </p>
          <Canvas draw={drawStrip} aspect={0.3} maxHeight={200} ariaLabel="Akı ve sirkülasyon integrandları; taranan alan o ana kadarki integral" />
          <p className="canvas-caption">
            Mavi: <Tex tex="d\Phi/d\tau" />, yeşil: <Tex tex="d\Gamma/d\tau" />. Boyalı alan o ana kadar toplanan değer; τ = 1’de tam akı ve tam
            sirkülasyon. {is3 ? 'Akı kürenin n kutbundan başlayarak (kutup açısı πτ), sirkülasyon çember boyunca (açı 2πτ) taranır.' : 'İkisi de çember boyunca 2πτ açısıyla taranır.'}
          </p>
          <div className="row">
            <button className="btn" aria-pressed={playing} onClick={() => { setStarted(true); setPlaying(!playing); }}>
              {playing ? 'Duraklat' : 'Taramayı oynat'}
            </button>
            <button className="btn" onClick={() => { setPlaying(false); setStarted(false); }}>Tamamını göster</button>
          </div>
          <Slider label="Tarama τ" value={sweep} min={0} max={1} step={0.005} onChange={(v) => { setStarted(true); setPlaying(false); setT(v); }} />
        </div>

        <div className="panel controls">
          <h3 style={{ margin: 0, fontSize: 15 }}>1. Vektör alanı</h3>
          <Tex block tex={`\\mathbf F=${sys.paramTex.map((p, i) => `F_{${p}}\\,${sys.unitTex[i]}`).join('+')}`} />
          <div className="row">
            {ui.presets.map((p) => (
              <button key={p.name} className="btn" aria-pressed={p.f.every((s, i) => s === f[i])} onClick={() => setF(p.f)}>{p.name}</button>
            ))}
          </div>
          {f.map((src, i) => {
            const c = compiled[i]!;
            return (
              <Field
                key={`${sysId}-${i}`}
                label={<Tex tex={`F_{${sys.paramTex[i]}}(${pTex})=`} />}
                value={src}
                onChange={(v) => setF(f.map((s, j) => (j === i ? v : s)))}
                error={typeof c === 'string' ? c : ''}
              />
            );
          })}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Değişkenler: {sys.params.join(', ')}. Örnek: 2r sin(phi), exp(-r^2), 1/r^2.
          </span>

          <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>2. P noktası ve R yarıçapı</h3>
          {sys.params.map((_, i) => (
            <Slider
              key={`${sysId}-p${i}`}
              label={<Tex tex={`${sys.paramTex[i]}_P`} />}
              value={q[i]!}
              min={sys.ranges[i]![0]}
              max={sys.ranges[i]![1]}
              onChange={(v) => setQ(q.map((s, j) => (j === i ? v : s)))}
            />
          ))}
          <Slider label="R" value={R} min={0.05} max={1.5} onChange={setR} />
          {is3 && (
            <div className="row">
              <span style={{ fontSize: 14 }}>Çember normali n:</span>
              {(['x', 'y', 'z', 'rot'] as NormalChoice[]).map((c) => (
                <button key={c} className="btn" aria-pressed={normal === c} onClick={() => setNormal(c)}>
                  {c === 'rot' ? 'rot F yönü' : `e_${c}`}
                </button>
              ))}
            </div>
          )}

          <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>3. Görünüm</h3>
          {is3 ? (
            <Slider label="Eksen başına ok" value={density3} min={3} max={8} step={1} onChange={setDensity3} format={(v) => `${v} (${v ** 3} ok)`} />
          ) : (
            <Slider label="Ok sıklığı" value={density} min={7} max={27} step={1} onChange={setDensity} format={(v) => String(v)} />
          )}
        </div>
      </div>
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

function Tile({ title, value, sub, color }: { title: ReactNode; value: ReactNode; sub: ReactNode; color: string }) {
  return (
    <div className="readout" style={{ borderLeft: `4px solid ${color}`, display: 'grid', gap: 2, padding: '6px 10px' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{title}</span>
      <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 13 }}>{sub}</span>
    </div>
  );
}

function Field(props: { label: ReactNode; value: string; onChange: (v: string) => void; error: string }) {
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
      {props.error && <span style={{ fontSize: 12, color: 'var(--c2)' }}>{props.error}</span>}
    </div>
  );
}
