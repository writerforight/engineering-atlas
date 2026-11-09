/**
 * Discrete convolution as a matrix, and how the DFT matrix diagonalises it.
 *
 * Linear:   y = a * b,  y[n] = Σ_k a[k] b[n−k],  length La + Lb − 1,  y = T_a b
 *           (T_a is the (La+Lb−1)×Lb Toeplitz matrix of a).
 * Circular: y = a ⊛_N b, indices mod N,             y = C_a b
 *           (C_a is the N×N circulant matrix of a, zero-padded or wrapped to N).
 *
 * F C_a F⁻¹ = diag(F a)  for every circulant; a Toeplitz matrix is not
 * diagonalised. Pure functions, no UI.
 */
import type { Complex } from './complex';
import type { Mat } from './matrix';

export type CMat = Complex[][];

/** Deterministic PRNG (mulberry32), so a sequence keeps its prefix when the length grows. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `len` random integers in [0, max] (or [−max, max] when `signed`). Same seed → same prefix. */
export function randomInts(seed: number, len: number, max: number, signed = false): number[] {
  const r = mulberry32(seed);
  const lo = signed ? -max : 0;
  return Array.from({ length: len }, () => lo + Math.floor(r() * (max - lo + 1)));
}

/** y[n] = Σ_k a[k] b[n−k], n = 0 … La+Lb−2. */
export function linearConv(a: readonly number[], b: readonly number[]): number[] {
  if (!a.length || !b.length) return [];
  const y = new Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((ak, k) => b.forEach((bj, j) => { y[k + j]! += ak * bj; }));
  return y;
}

/** Fold x onto length N: x_N[n] = Σ_m x[n + mN] (zero-pads when x is shorter). */
export function wrapTo(x: readonly number[], N: number): number[] {
  const out = new Array<number>(N).fill(0);
  x.forEach((v, i) => { out[i % N]! += v; });
  return out;
}

/** N-point circular convolution: y[n] = Σ_k a_N[k] b_N[(n−k) mod N]. */
export function circularConv(a: readonly number[], b: readonly number[], N: number): number[] {
  const aN = wrapTo(a, N), bN = wrapTo(b, N);
  return Array.from({ length: N }, (_, n) => aN.reduce((s, ak, k) => s + ak * bN[(n - k + N) % N]!, 0));
}

/** (La+Lb−1)×Lb Toeplitz matrix of a: T[i][j] = a[i−j] (0 outside), so T b = a * b. */
export function toeplitz(a: readonly number[], Lb: number): Mat {
  const M = a.length + Lb - 1;
  return Array.from({ length: M }, (_, i) => Array.from({ length: Lb }, (_, j) => a[i - j] ?? 0));
}

/** N×N lower-triangular Toeplitz matrix of a (no wrap-around): L[i][j] = a[i−j]. */
export function lowerToeplitz(a: readonly number[], N: number): Mat {
  return Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => a[i - j] ?? 0));
}

/** N×N circulant matrix of a (wrapped to N): C[i][j] = a_N[(i−j) mod N]. Each column is the previous one shifted down by one. */
export function circulant(a: readonly number[], N: number): Mat {
  const aN = wrapTo(a, N);
  return Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => aN[(i - j + N) % N]!));
}

/** Unnormalised DFT matrix: F[k][n] = e^{−2πi kn/N} = W^{kn}. */
export function dftMatrix(N: number): CMat {
  return Array.from({ length: N }, (_, k) =>
    Array.from({ length: N }, (_, n) => {
      const th = (-2 * Math.PI * ((k * n) % N)) / N;
      return [Math.cos(th), Math.sin(th)] as Complex;
    }));
}

/** Inverse DFT matrix: F⁻¹ = conj(F)/N. */
export function idftMatrix(N: number): CMat {
  return dftMatrix(N).map((r) => r.map(([re, im]) => [re / N, -im / N] as Complex));
}

export const toComplexMat = (A: Mat): CMat => A.map((r) => r.map((v) => [v, 0] as Complex));

/** Complex matrix product (A: m×p, B: p×n). */
export function cmatmul(A: CMat, B: CMat): CMat {
  const p = B.length, n = B[0]?.length ?? 0;
  return A.map((row) => {
    const out: Complex[] = [];
    for (let j = 0; j < n; j++) {
      let re = 0, im = 0;
      for (let k = 0; k < p; k++) {
        const [ar, ai] = row[k]!, [br, bi] = B[k]![j]!;
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      out.push([re, im]);
    }
    return out;
  });
}

/** X = F x for a real vector (direct O(N²) sum, matches dftMatrix exactly). */
export function dftVec(x: readonly number[]): Complex[] {
  const N = x.length;
  return Array.from({ length: N }, (_, k) => {
    let re = 0, im = 0;
    x.forEach((v, n) => {
      const th = (-2 * Math.PI * ((k * n) % N)) / N;
      re += v * Math.cos(th);
      im += v * Math.sin(th);
    });
    return [re, im] as Complex;
  });
}

/** Element-wise (Hadamard) product of two complex vectors. */
export function hadamard(X: readonly Complex[], Y: readonly Complex[]): Complex[] {
  return X.map(([a, b], k) => {
    const [c, d] = Y[k]!;
    return [a * c - b * d, a * d + b * c] as Complex;
  });
}

/** Real inverse DFT of X (imaginary parts of the result are dropped). */
export function idftReal(X: readonly Complex[]): number[] {
  const N = X.length;
  return Array.from({ length: N }, (_, n) => {
    let re = 0;
    X.forEach(([xr, xi], k) => {
      const th = (2 * Math.PI * ((k * n) % N)) / N;
      re += xr * Math.cos(th) - xi * Math.sin(th);
    });
    return re / N;
  });
}

/** √(Σ_{i≠j}|A_ij|²) / √(Σ|A_ij|²): 0 for a diagonal matrix. */
export function offDiagonalRatio(A: CMat): number {
  let off = 0, all = 0;
  A.forEach((r, i) => r.forEach(([re, im], j) => {
    const m = re * re + im * im;
    all += m;
    if (i !== j) off += m;
  }));
  return all ? Math.sqrt(off / all) : 0;
}

/** Largest |A_ij| with i ≠ j. */
export function maxOffDiagonal(A: CMat): number {
  let m = 0;
  A.forEach((r, i) => r.forEach(([re, im], j) => { if (i !== j) m = Math.max(m, Math.hypot(re, im)); }));
  return m;
}
