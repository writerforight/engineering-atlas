/**
 * Projection of a sampled signal onto cos/sin rows: f_ω = Δt · C · f_t with
 * C_kn = cos(ω_k t_n), S_kn = sin(ω_k t_n) on the DFT grid ω_k = 2πk/T, k = 0…⌊N/2⌋.
 * Plus the three ways of differentiating / integrating the samples compared in the
 * cos-sin-projection topic: central difference, backward difference, exact spectral.
 */
import type { Mat } from './matrix';

export interface TrigGrid {
  N: number;
  T: number;
  dt: number;
  /** t_n = n Δt, n = 0…N−1 */
  t: number[];
  /** ω_k = 2πk/T, k = 0…⌊N/2⌋ */
  omega: number[];
}

export type DiffMethod = 'central' | 'backward' | 'spectral';

export function trigGrid(N: number, T = 2 * Math.PI): TrigGrid {
  const dt = T / N;
  return {
    N, T, dt,
    t: Array.from({ length: N }, (_, n) => n * dt),
    omega: Array.from({ length: Math.floor(N / 2) + 1 }, (_, k) => (2 * Math.PI * k) / T),
  };
}

/** K×N matrix with rows cos(ω_k t) (rows = frequency, columns = time). */
export function cosMatrix(g: TrigGrid): Mat {
  return g.omega.map((w) => g.t.map((t) => Math.cos(w * t)));
}

export function sinMatrix(g: TrigGrid): Mat {
  return g.omega.map((w) => g.t.map((t) => Math.sin(w * t)));
}

/** Δt · M · f */
export function project(M: Mat, f: readonly number[], dt: number): number[] {
  return M.map((row) => dt * row.reduce((s, m, n) => s + m * f[n]!, 0));
}

/** Weight turning a projection into an amplitude: 2/T, but 1/T for ω = 0 and for the Nyquist row (N even). */
export function ampWeight(g: TrigGrid, k: number): number {
  return k === 0 || (g.N % 2 === 0 && k === g.N / 2) ? 1 / g.T : 2 / g.T;
}

/** Amplitudes a_k (cos) and b_k (sin) so that f_n = Σ a_k cos(ω_k t_n) + b_k sin(ω_k t_n). */
export function amplitudes(g: TrigGrid, f: readonly number[]): { a: number[]; b: number[] } {
  const fc = project(cosMatrix(g), f, g.dt);
  const fs = project(sinMatrix(g), f, g.dt);
  return { a: fc.map((v, k) => v * ampWeight(g, k)), b: fs.map((v, k) => v * ampWeight(g, k)) };
}

/** Trigonometric interpolant Σ a_k cos(ω_k t) + b_k sin(ω_k t) at any t. */
export function synth(g: TrigGrid, a: readonly number[], b: readonly number[], t: number): number {
  return g.omega.reduce((s, w, k) => s + a[k]! * Math.cos(w * t) + b[k]! * Math.sin(w * t), 0);
}

/** N×N circulant difference matrix: central (f_{n+1} − f_{n−1})/2Δt or backward (f_n − f_{n−1})/Δt. */
export function diffMatrix(N: number, dt: number, method: 'central' | 'backward'): Mat {
  const D: Mat = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let n = 0; n < N; n++) {
    if (method === 'central') {
      D[n]![(n + 1) % N] = 1 / (2 * dt);
      D[n]![(n - 1 + N) % N] = -1 / (2 * dt);
    } else {
      D[n]![n] = 1 / dt;
      D[n]![(n - 1 + N) % N] = -1 / dt;
    }
  }
  return D;
}

/** Spectral derivative coefficients: a′ = ω b, b′ = −ω a (the Nyquist row has no sin partner and is dropped). */
export function derivCoeffs(g: TrigGrid, a: readonly number[], b: readonly number[]) {
  const nyq = g.N % 2 === 0 ? g.N / 2 : -1;
  return {
    a: g.omega.map((w, k) => (k === nyq ? 0 : w * b[k]!)),
    b: g.omega.map((w, k) => (k === nyq ? 0 : -w * a[k]!)),
  };
}

export function derivative(g: TrigGrid, f: readonly number[], method: DiffMethod): number[] {
  if (method !== 'spectral') {
    const D = diffMatrix(g.N, g.dt, method);
    return D.map((row) => row.reduce((s, d, n) => s + d * f[n]!, 0));
  }
  const { a, b } = amplitudes(g, f);
  const d = derivCoeffs(g, a, b);
  return g.t.map((t) => synth(g, d.a, d.b, t));
}

export interface Integral {
  /** samples F_n */
  F: number[];
  /** the mean of f; ≠ 0 means the integral grows like mean·t and is not periodic */
  mean: number;
  /** spectral only: F(t) for any t (exact integral of the interpolant) */
  at?: (t: number) => number;
}

/**
 * Integral with F(0) = F0. backward: rectangle rule F_n = F_{n−1} + Δt f_n (inverse of the backward difference);
 * central: trapezoid rule; spectral: a_k cos → (a_k/ω) sin, b_k sin → −(b_k/ω) cos, the mean → mean·t.
 */
export function integral(g: TrigGrid, f: readonly number[], method: DiffMethod, F0 = 0): Integral {
  const mean = f.reduce((s, v) => s + v, 0) / g.N;
  if (method !== 'spectral') {
    const F = [F0];
    for (let n = 1; n < g.N; n++) {
      const step = method === 'backward' ? f[n]! : (f[n - 1]! + f[n]!) / 2;
      F.push(F[n - 1]! + g.dt * step);
    }
    return { F, mean };
  }
  const { a, b } = amplitudes(g, f);
  const nyq = g.N % 2 === 0 ? g.N / 2 : -1;
  const A = g.omega.map((w, k) => (k === 0 || k === nyq ? 0 : -b[k]! / w));
  const B = g.omega.map((w, k) => (k === 0 || k === nyq ? 0 : a[k]! / w));
  const c = F0 - synth(g, A, B, 0);
  const at = (t: number) => a[0]! * t + synth(g, A, B, t) + c;
  return { F: g.t.map(at), mean, at };
}
