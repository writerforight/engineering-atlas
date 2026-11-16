/**
 * Vector fields written in the local unit vectors of a coordinate system
 * (F = F₁ e₁ + F₂ e₂ (+ F₃ e₃), every Fᵢ a function of the system's coordinates),
 * and the four quantities around a point: divergence, curl, flux through a circle/sphere
 * and circulation around a circle. Everything is evaluated numerically in Cartesian space,
 * so the same code serves every coordinate system.
 */
import type { Vec } from './matrix';

export type SystemId = 'cart2' | 'polar' | 'cart3' | 'cyl' | 'sph';

export interface CoordSystem {
  id: SystemId;
  dim: 2 | 3;
  /** Names usable in formulas. */
  params: string[];
  /** TeX of the coordinates and of the unit vectors. */
  paramTex: string[];
  unitTex: string[];
  /** Slider range of each coordinate. */
  ranges: [number, number][];
  toCart: (q: Vec) => Vec;
  fromCart: (x: Vec) => Vec;
  /** Cartesian components of the unit vectors at coordinates q. */
  basis: (q: Vec) => Vec[];
}

const TAU = 2 * Math.PI;
const wrap = (a: number) => (a < 0 ? a + TAU : a);

export const SYSTEMS: Record<SystemId, CoordSystem> = {
  cart2: {
    id: 'cart2', dim: 2, params: ['x', 'y'], paramTex: ['x', 'y'], unitTex: ['\\mathbf e_x', '\\mathbf e_y'],
    ranges: [[-3, 3], [-3, 3]],
    toCart: (q) => [q[0]!, q[1]!],
    fromCart: (x) => [x[0]!, x[1]!],
    basis: () => [[1, 0], [0, 1]],
  },
  polar: {
    id: 'polar', dim: 2, params: ['r', 'phi'], paramTex: ['r', '\\varphi'], unitTex: ['\\mathbf e_r', '\\mathbf e_\\varphi'],
    ranges: [[0, 3], [0, TAU]],
    toCart: ([r, p]) => [r! * Math.cos(p!), r! * Math.sin(p!)],
    fromCart: ([x, y]) => [Math.hypot(x!, y!), wrap(Math.atan2(y!, x!))],
    basis: ([, p]) => [[Math.cos(p!), Math.sin(p!)], [-Math.sin(p!), Math.cos(p!)]],
  },
  cart3: {
    id: 'cart3', dim: 3, params: ['x', 'y', 'z'], paramTex: ['x', 'y', 'z'],
    unitTex: ['\\mathbf e_x', '\\mathbf e_y', '\\mathbf e_z'],
    ranges: [[-2, 2], [-2, 2], [-2, 2]],
    toCart: (q) => [q[0]!, q[1]!, q[2]!],
    fromCart: (x) => [x[0]!, x[1]!, x[2]!],
    basis: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  },
  cyl: {
    id: 'cyl', dim: 3, params: ['r', 'phi', 'z'], paramTex: ['r', '\\varphi', 'z'],
    unitTex: ['\\mathbf e_r', '\\mathbf e_\\varphi', '\\mathbf e_z'],
    ranges: [[0, 2], [0, TAU], [-2, 2]],
    toCart: ([r, p, z]) => [r! * Math.cos(p!), r! * Math.sin(p!), z!],
    fromCart: ([x, y, z]) => [Math.hypot(x!, y!), wrap(Math.atan2(y!, x!)), z!],
    basis: ([, p]) => [[Math.cos(p!), Math.sin(p!), 0], [-Math.sin(p!), Math.cos(p!), 0], [0, 0, 1]],
  },
  sph: {
    id: 'sph', dim: 3, params: ['r', 'theta', 'phi'], paramTex: ['r', '\\vartheta', '\\varphi'],
    unitTex: ['\\mathbf e_r', '\\mathbf e_\\vartheta', '\\mathbf e_\\varphi'],
    ranges: [[0, 2.5], [0, Math.PI], [0, TAU]],
    toCart: ([r, t, p]) => [r! * Math.sin(t!) * Math.cos(p!), r! * Math.sin(t!) * Math.sin(p!), r! * Math.cos(t!)],
    fromCart: ([x, y, z]) => {
      const r = Math.hypot(x!, y!, z!);
      return [r, r > 0 ? Math.acos(Math.max(-1, Math.min(1, z! / r))) : 0, wrap(Math.atan2(y!, x!))];
    },
    basis: ([, t, p]) => {
      const st = Math.sin(t!), ct = Math.cos(t!), sp = Math.sin(p!), cp = Math.cos(p!);
      return [[st * cp, st * sp, ct], [ct * cp, ct * sp, -st], [-sp, cp, 0]];
    },
  },
};

export type CartField = (x: Vec) => Vec;

/** Cartesian field x ↦ Σ compᵢ(q) eᵢ(q) with q = fromCart(x). */
export function cartesianField(sys: CoordSystem, comps: ReadonlyArray<(q: Vec) => number>): CartField {
  return (x) => {
    const q = sys.fromCart(x);
    const E = sys.basis(q);
    const out = new Array<number>(sys.dim).fill(0);
    for (let i = 0; i < sys.dim; i++) {
      const c = comps[i]!(q);
      for (let k = 0; k < sys.dim; k++) out[k] = out[k]! + c * E[i]![k]!;
    }
    return out;
  };
}

/** ∂Fᵢ/∂xⱼ by central differences. */
function jacobian(F: CartField, p: Vec, h: number): number[][] {
  const n = p.length;
  const J = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    const a = p.slice(), b = p.slice();
    a[j] = a[j]! + h;
    b[j] = b[j]! - h;
    const Fa = F(a), Fb = F(b);
    for (let i = 0; i < n; i++) J[i]![j] = (Fa[i]! - Fb[i]!) / (2 * h);
  }
  return J;
}

export function divergence(F: CartField, p: Vec, h = 1e-4): number {
  const J = jacobian(F, p, h);
  return J.reduce((s, row, i) => s + row[i]!, 0);
}

/** Curl as a 3-vector; in 2D only the z component is non-zero. */
export function curl(F: CartField, p: Vec, h = 1e-4): [number, number, number] {
  const J = jacobian(F, p, h);
  if (p.length === 2) return [0, 0, J[1]![0]! - J[0]![1]!];
  return [J[2]![1]! - J[1]![2]!, J[0]![2]! - J[2]![0]!, J[1]![0]! - J[0]![1]!];
}

const cross = (a: Vec, b: Vec): Vec => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const dot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i]!, 0);
const unit = (a: Vec): Vec => {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l);
};

/** Right-handed orthonormal frame (u, v, n) for a given normal direction. */
export function frame(normal: Vec): [Vec, Vec, Vec] {
  const n = unit(normal);
  const helper = Math.abs(n[2]!) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = unit(cross(helper, n));
  return [u, cross(n, u), n];
}

export interface Sweep {
  /** Integrand per unit of the sweep variable τ ∈ [0, 1] at the midpoints (so Σ w/N = total). */
  w: Float64Array;
  /** Running integral at the right edge of each cell. */
  cum: Float64Array;
  total: number;
}

function finish(w: Float64Array): Sweep {
  const cum = new Float64Array(w.length);
  let s = 0;
  for (let i = 0; i < w.length; i++) {
    s += (Number.isFinite(w[i]!) ? w[i]! : 0) / w.length;
    cum[i] = s;
  }
  return { w, cum, total: s };
}

/** Point on the circle of radius R around p at angle a (2D: counter-clockwise; 3D: right-handed about `normal`). */
export function circlePoint(p: Vec, R: number, a: number, normal?: Vec): { x: Vec; t: Vec; out: Vec } {
  const c = Math.cos(a), s = Math.sin(a);
  if (p.length === 2) return { x: [p[0]! + R * c, p[1]! + R * s], t: [-s, c], out: [c, s] };
  const [u, v] = frame(normal ?? [0, 0, 1]);
  const out = u.map((ui, i) => c * ui + s * v[i]!);
  return { x: p.map((pi, i) => pi + R * out[i]!), t: u.map((ui, i) => -s * ui + c * v[i]!), out };
}

/** Circulation ∮ F·dl around the circle, swept by the angle 2πτ. */
export function circulation(F: CartField, p: Vec, R: number, normal?: Vec, N = 240): Sweep {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const { x, t } = circlePoint(p, R, (TAU * (i + 0.5)) / N, normal);
    w[i] = dot(F(x), t) * TAU * R;
  }
  return finish(w);
}

/** 2D flux ∮ F·n ds out of the circle, swept by the angle 2πτ. */
export function circleFlux(F: CartField, p: Vec, R: number, N = 240): Sweep {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const { x, out } = circlePoint(p, R, (TAU * (i + 0.5)) / N);
    w[i] = dot(F(x), out) * TAU * R;
  }
  return finish(w);
}

/** Point on the sphere of radius R around p: polar angle a from `axis`, azimuth b. */
export function spherePoint(p: Vec, R: number, a: number, b: number, axis: Vec): { x: Vec; out: Vec } {
  const [u, v, n] = frame(axis);
  const sa = Math.sin(a), ca = Math.cos(a), cb = Math.cos(b), sb = Math.sin(b);
  const out = [0, 1, 2].map((i) => sa * cb * u[i]! + sa * sb * v[i]! + ca * n[i]!);
  return { x: p.map((pi, i) => pi + R * out[i]!), out };
}

/** 3D flux ∯ F·n dA out of the sphere, swept from the pole `axis` by the polar angle πτ. */
export function sphereFlux(F: CartField, p: Vec, R: number, axis: Vec = [0, 0, 1], Na = 96, Nb = 96): Sweep {
  const w = new Float64Array(Na);
  for (let i = 0; i < Na; i++) {
    const a = (Math.PI * (i + 0.5)) / Na;
    let ring = 0;
    for (let j = 0; j < Nb; j++) {
      const { x, out } = spherePoint(p, R, a, (TAU * (j + 0.5)) / Nb, axis);
      const f = dot(F(x), out);
      if (Number.isFinite(f)) ring += f;
    }
    w[i] = ring * (TAU / Nb) * R * R * Math.sin(a) * Math.PI;
  }
  return finish(w);
}
