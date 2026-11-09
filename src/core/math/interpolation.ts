// Polynomial interpolation in barycentric form: equidistant vs Chebyshev nodes,
// errors on a test grid, and the Lebesgue constant of a node set.

export type NodeKind = 'equi' | 'cheb';

/** n nodes on [a, b]. Equidistant includes both ends; Chebyshev = roots of T_n (first kind). */
export function nodes(kind: NodeKind, n: number, a = -1, b = 1): number[] {
  const mid = (a + b) / 2, half = (b - a) / 2;
  if (n === 1) return [mid];
  return Array.from({ length: n }, (_, j) =>
    kind === 'equi'
      ? a + ((b - a) * j) / (n - 1)
      : mid - half * Math.cos(((2 * j + 1) * Math.PI) / (2 * n)), // ascending order
  );
}

/** General barycentric weights w_j = 1 / ∏_{k≠j} (x_j − x_k), scaled so max |w| = 1. */
export function baryWeights(x: readonly number[]): number[] {
  const w = x.map((xj, j) => {
    let p = 1;
    x.forEach((xk, k) => { if (k !== j) p *= xj - xk; });
    return 1 / p;
  });
  const m = Math.max(...w.map(Math.abs));
  return w.map((v) => v / m);
}

/**
 * Closed-form weights (up to a common factor, which cancels in the formula):
 * equidistant w_j = (−1)^j C(n−1, j), Chebyshev w_j = (−1)^j sin((2j+1)π/(2n)).
 * The sign follows the ascending node order used by `nodes`.
 */
export function nodeWeights(kind: NodeKind, n: number): number[] {
  if (kind === 'equi') {
    const w: number[] = [];
    let c = 1;
    for (let j = 0; j < n; j++) {
      w.push((j % 2 ? -1 : 1) * c);
      c = (c * (n - 1 - j)) / (j + 1);
    }
    const m = Math.max(...w.map(Math.abs));
    return w.map((v) => v / m);
  }
  return Array.from({ length: n }, (_, j) => (j % 2 ? -1 : 1) * Math.sin(((2 * j + 1) * Math.PI) / (2 * n)));
}

/** Second (true) barycentric formula p(t) = Σ w_j f_j/(t−x_j) / Σ w_j/(t−x_j). */
export function baryEval(x: readonly number[], f: readonly number[], w: readonly number[], t: number): number {
  let num = 0, den = 0;
  for (let j = 0; j < x.length; j++) {
    const d = t - x[j]!;
    if (d === 0) return f[j]!;
    const c = w[j]! / d;
    num += c * f[j]!;
    den += c;
  }
  return num / den;
}

/** Lebesgue function λ(t) = Σ |ℓ_j(t)|, with ℓ_j(t) = (w_j/(t−x_j)) / Σ_k w_k/(t−x_k). */
export function lebesgueFn(x: readonly number[], w: readonly number[], t: number): number {
  let abs = 0, den = 0;
  for (let j = 0; j < x.length; j++) {
    const d = t - x[j]!;
    if (d === 0) return 1;
    const c = w[j]! / d;
    abs += Math.abs(c);
    den += c;
  }
  return abs / Math.abs(den);
}

export function linspace(a: number, b: number, m: number): number[] {
  return Array.from({ length: m }, (_, i) => (m === 1 ? a : a + ((b - a) * i) / (m - 1)));
}

/** Λ = max λ(t), estimated on a fine grid. */
export function lebesgueConst(x: readonly number[], w: readonly number[], a = -1, b = 1, samples = 2000): number {
  let m = 0;
  for (const t of linspace(a, b, samples)) m = Math.max(m, lebesgueFn(x, w, t));
  return m;
}

export interface InterpResult {
  x: number[];
  fx: number[];
  w: number[];
  /** p evaluated on the test grid */
  p: number[];
  rms: number;
  max: number;
  /** grid index where |p − f| is largest */
  argmax: number;
}

/** Interpolate f at n nodes and evaluate the polynomial on the test grid. */
export function interpolate(f: (t: number) => number, kind: NodeKind, n: number, grid: readonly number[], a = -1, b = 1): InterpResult {
  const x = nodes(kind, n, a, b);
  const fx = x.map(f);
  const w = nodeWeights(kind, n);
  const p = grid.map((t) => baryEval(x, fx, w, t));
  const { rms, max, argmax } = errors(p, grid.map(f));
  return { x, fx, w, p, rms, max, argmax };
}

export function errors(p: readonly number[], exact: readonly number[]) {
  let s = 0, max = 0, argmax = 0;
  p.forEach((v, i) => {
    const e = Math.abs(v - exact[i]!);
    s += e * e;
    if (e > max || !Number.isFinite(e)) { max = e; argmax = i; }
  });
  return { rms: Math.sqrt(s / p.length), max, argmax };
}

export interface ErrorCurvePoint { n: number; rms: number; max: number; lebesgue: number }

/** e_interp(n) for n = nMin..nMax: RMS and max error on the grid, plus Λ_n. */
export function errorCurve(f: (t: number) => number, kind: NodeKind, grid: readonly number[], nMin = 2, nMax = 40, a = -1, b = 1): ErrorCurvePoint[] {
  const out: ErrorCurvePoint[] = [];
  for (let n = nMin; n <= nMax; n++) {
    const r = interpolate(f, kind, n, grid, a, b);
    out.push({ n, rms: r.rms, max: r.max, lebesgue: lebesgueConst(r.x, r.w, a, b, 1000) });
  }
  return out;
}
