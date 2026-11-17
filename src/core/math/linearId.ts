/**
 * Identifying an unknown linear map y = A x from experiments, and inverting it.
 * Small dense matrices only: SVD via a cyclic Jacobi eigen-decomposition of AᵀA.
 */
import { mul, mulVec, transpose, zeros, type Mat, type Vec } from './matrix';

/** Eigen-decomposition of a symmetric matrix: values descending, vectors as columns of V. */
export function symEig(S: Mat): { values: number[]; V: Mat } {
  const n = S.length;
  const A = S.map((r) => r.slice());
  const V: Mat = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i]![j]! ** 2;
    if (off < 1e-26) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p]![q]!) < 1e-300) continue;
        const th = (A[q]![q]! - A[p]![p]!) / (2 * A[p]![q]!);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let r = 0; r < n; r++) {
          const arp = A[r]![p]!, arq = A[r]![q]!;
          A[r]![p] = c * arp - s * arq; A[r]![q] = s * arp + c * arq;
        }
        for (let r = 0; r < n; r++) {
          const apr = A[p]![r]!, aqr = A[q]![r]!;
          A[p]![r] = c * apr - s * aqr; A[q]![r] = s * apr + c * aqr;
        }
        for (let r = 0; r < n; r++) {
          const vrp = V[r]![p]!, vrq = V[r]![q]!;
          V[r]![p] = c * vrp - s * vrq; V[r]![q] = s * vrp + c * vrq;
        }
      }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[j]![j]! - A[i]![i]!);
  return { values: order.map((i) => A[i]![i]!), V: V.map((r) => order.map((i) => r[i]!)) };
}

export interface Svd {
  /** Singular values, descending, length min(m, n). */
  s: number[];
  /** Right singular vectors (input space), columns, n×n. */
  V: Mat;
  /** Left singular vectors (output space) for nonzero σ, columns, m×rank. */
  U: Mat;
  rank: number;
}

/** A = U Σ Vᵀ. `rtol` decides which σ count as zero (relative to σ_max; going through AᵀA limits accuracy to ~√ε). */
export function svd(A: Mat, rtol = 1e-6): Svd {
  const m = A.length, n = A[0]?.length ?? 0;
  const { values, V } = symEig(mul(transpose(A), A));
  const all = values.map((l) => Math.sqrt(Math.max(0, l)));
  const s = all.slice(0, Math.min(m, n));
  const tol = (s[0] ?? 0) * rtol;
  const rank = s.filter((x) => x > tol && x > 1e-14).length;
  const U = zeros(m, rank);
  for (let k = 0; k < rank; k++) {
    const v = V.map((r) => r[k]!);
    const u = mulVec(A, v);
    for (let i = 0; i < m; i++) U[i]![k] = u[i]! / s[k]!;
  }
  return { s, V, U, rank };
}

/** Moore–Penrose pseudo-inverse A⁺ = V Σ⁺ Uᵀ (only σ above tolerance are inverted). */
export function pinv(A: Mat, rtol = 1e-6): { P: Mat; svd: Svd } {
  const m = A.length, n = A[0]?.length ?? 0;
  const d = svd(A, rtol);
  const P = zeros(n, m);
  for (let k = 0; k < d.rank; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++) P[i]![j]! += (d.V[i]![k]! * d.U[j]![k]!) / d.s[k]!;
  return { P, svd: d };
}

/** Least-squares estimate Â = Y X⁺ from experiments (columns of X are inputs, of Y outputs). */
export function identifyLinear(X: Mat, Y: Mat): { Ahat: Mat; Xsvd: Svd } {
  const { P, svd: Xsvd } = pinv(X);
  return { Ahat: mul(Y, P), Xsvd };
}

/** Seeded uniform generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded standard-normal matrix (Box–Muller). */
export function randnMat(rows: number, cols: number, seed: number): Mat {
  const u = rng(seed);
  const g = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  return Array.from({ length: rows }, () => Array.from({ length: cols }, g));
}

export function vecNorm(v: Vec): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}
