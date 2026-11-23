/**
 * Gauss–Legendre quadrature from scratch: Gram–Schmidt on monomials, the
 * three-term recurrence, the Jacobi matrix (Golub–Welsch) and the checks
 * used on the topic page (exactness degree, moment system, cell widths).
 * Polynomials are coefficient arrays, lowest power first.
 */
import { symEig } from './linearId';
import type { Mat } from './matrix';

export type Poly = number[];

/** ∫_{-1}^{1} x^k dx */
export function moment(k: number): number {
  return k % 2 === 0 ? 2 / (k + 1) : 0;
}

/** ⟨p, q⟩ = ∫_{-1}^{1} p q dx, exact via moments. */
export function inner(p: Poly, q: Poly): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) s += p[i]! * q[j]! * moment(i + j);
  return s;
}

export function evalPoly(p: Poly, x: number): number {
  let s = 0;
  for (let i = p.length - 1; i >= 0; i--) s = s * x + p[i]!;
  return s;
}

export interface GramSchmidtStep {
  /** monic p_n */
  p: Poly;
  /** projection coefficients c_k = ⟨xⁿ, p_k⟩ / ⟨p_k, p_k⟩ for k < n */
  coef: number[];
}

/** Monic Legendre polynomials p_0 … p_n by Gram–Schmidt on 1, x, x², … */
export function gramSchmidt(n: number): GramSchmidtStep[] {
  const out: GramSchmidtStep[] = [];
  for (let m = 0; m <= n; m++) {
    const xm: Poly = Array.from({ length: m + 1 }, (_, i) => (i === m ? 1 : 0));
    const p = xm.slice();
    const coef: number[] = [];
    for (let k = 0; k < m; k++) {
      const pk = out[k]!.p;
      const c = inner(xm, pk) / inner(pk, pk);
      coef.push(c);
      for (let i = 0; i < pk.length; i++) p[i]! -= c * pk[i]!;
    }
    out.push({ p, coef });
  }
  return out;
}

/** b_n = n² / (4n² − 1) for monic Legendre (a_n = 0). */
export function legendreB(n: number): number {
  return (n * n) / (4 * n * n - 1);
}

/** Monic p_0 … p_n by the recurrence p_{k+1} = x p_k − b_k p_{k−1}. */
export function monicByRecurrence(n: number): Poly[] {
  const P: Poly[] = [[1]];
  if (n >= 1) P.push([0, 1]);
  for (let k = 1; k < n; k++) {
    const next: Poly = Array(k + 2).fill(0);
    P[k]!.forEach((c, i) => (next[i + 1]! += c));
    P[k - 1]!.forEach((c, i) => (next[i]! -= legendreB(k) * c));
    P.push(next);
  }
  return P;
}

/** Values p_0(x) … p_n(x) of the monic polynomials (recurrence, stable). */
export function monicValues(n: number, x: number): number[] {
  const v = [1];
  if (n >= 1) v.push(x);
  for (let k = 1; k < n; k++) v.push(x * v[k]! - legendreB(k) * v[k - 1]!);
  return v;
}

/** ‖p_n‖² of the monic polynomial = 2 · b_1 ⋯ b_n. */
export function monicNormSq(n: number): number {
  let s = 2;
  for (let k = 1; k <= n; k++) s *= legendreB(k);
  return s;
}

/** Non-symmetric recurrence matrix T (N×N): row k = [b_k, 0, 1] around the diagonal. */
export function recurrenceT(N: number): Mat {
  const T: Mat = Array.from({ length: N }, () => Array(N).fill(0));
  for (let k = 0; k < N; k++) {
    if (k + 1 < N) T[k]![k + 1] = 1;
    if (k >= 1) T[k]![k - 1] = legendreB(k);
  }
  return T;
}

/** Diagonal of D with J = D T D⁻¹: d_k = 1/‖p_k‖ up to the common factor 1/‖p_0‖. */
export function scalingD(N: number): number[] {
  const d = [1];
  for (let k = 1; k < N; k++) d.push(d[k - 1]! / Math.sqrt(legendreB(k)));
  return d;
}

/** Symmetric Jacobi matrix J_N: zero diagonal, β_k = (4 − k⁻²)^(−1/2) beside it. */
export function jacobiMatrix(N: number): Mat {
  const J: Mat = Array.from({ length: N }, () => Array(N).fill(0));
  for (let k = 1; k < N; k++) {
    const beta = 1 / Math.sqrt(4 - 1 / (k * k));
    J[k - 1]![k] = beta;
    J[k]![k - 1] = beta;
  }
  return J;
}

export interface Rule {
  x: number[];
  w: number[];
}

/** Golub–Welsch: nodes = eigenvalues of J_N, weights = 2 · (first eigenvector component)². */
export function gaussLegendre(N: number): Rule & { V: Mat } {
  if (N === 1) return { x: [0], w: [2], V: [[1]] };
  const { values, V } = symEig(jacobiMatrix(N));
  const order = values.map((_, i) => i).sort((i, j) => values[i]! - values[j]!);
  return {
    x: order.map((i) => values[i]!),
    w: order.map((i) => 2 * V[0]![i]! ** 2),
    V: V.map((r) => order.map((i) => r[i]!)),
  };
}

/** Lemma: [-1,1] → [a,b], nodes shifted/stretched and weights stretched. */
export function transformRule(r: Rule, a: number, b: number): Rule {
  const m = (a + b) / 2, h = (b - a) / 2;
  return { x: r.x.map((t) => m + h * t), w: r.w.map((t) => h * t) };
}

/** Naive weights: width of the cell around each node (cells cut at midpoints). */
export function cellWidths(x: readonly number[], a: number, b: number): number[] {
  return x.map((xi, i) => {
    const lo = i === 0 ? a : (x[i - 1]! + xi) / 2;
    const hi = i === x.length - 1 ? b : (xi + x[i + 1]!) / 2;
    return hi - lo;
  });
}

/** Moment system Σ_i w_i x_iᵏ = ∫xᵏ (k = 0…N−1), Gaussian elimination with partial pivoting. */
export function momentWeights(x: readonly number[]): number[] {
  const N = x.length;
  const A = Array.from({ length: N }, (_, k) => [...x.map((xi) => xi ** k), moment(k)]);
  for (let c = 0; c < N; c++) {
    let piv = c;
    for (let r = c + 1; r < N; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[piv]![c]!)) piv = r;
    [A[c], A[piv]] = [A[piv]!, A[c]!];
    for (let r = c + 1; r < N; r++) {
      const f = A[r]![c]! / A[c]![c]!;
      for (let k = c; k <= N; k++) A[r]![k]! -= f * A[c]![k]!;
    }
  }
  const w = Array(N).fill(0);
  for (let r = N - 1; r >= 0; r--) {
    let s = A[r]![N]!;
    for (let k = r + 1; k < N; k++) s -= A[r]![k]! * w[k];
    w[r] = s / A[r]![r]!;
  }
  return w;
}

export function quad(r: Rule, f: (x: number) => number): number {
  return r.x.reduce((s, xi, i) => s + r.w[i]! * f(xi), 0);
}

/** |Q(xᵏ) − ∫xᵏ| for k = 0 … kMax on [-1, 1]. */
export function monomialErrors(r: Rule, kMax: number): number[] {
  return Array.from({ length: kMax + 1 }, (_, k) => Math.abs(quad(r, (t) => t ** k) - moment(k)));
}

/** Largest m with error ≤ tol for all k ≤ m (−1 if already k = 0 fails). */
export function exactnessDegree(r: Rule, tol: number, kMax = 200): number {
  for (let k = 0; k <= kMax; k++) if (Math.abs(quad(r, (t) => t ** k) - moment(k)) > tol) return k - 1;
  return kMax;
}

/** Best fraction p/q with q ≤ maxQ, or null if none is within tol. */
export function asFraction(v: number, maxQ = 2000, tol = 1e-9): [number, number] | null {
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(v * q);
    if (Math.abs(p / q - v) < tol) return [p, q];
  }
  return null;
}

/** LaTeX for a number, as a fraction when it is one. */
export function texNum(v: number, digits = 4): string {
  if (Math.abs(v) < 1e-12) return '0';
  const fr = asFraction(v);
  if (!fr) return v.toFixed(digits);
  const [p, q] = fr;
  if (q === 1) return String(p);
  return `${p < 0 ? '-' : ''}\\tfrac{${Math.abs(p)}}{${q}}`;
}

/** LaTeX for a polynomial, highest power first. */
export function texPoly(p: Poly, varName = 'x'): string {
  const terms: string[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i]!;
    if (Math.abs(c) < 1e-12) continue;
    const mono = i === 0 ? '' : i === 1 ? varName : `${varName}^{${i}}`;
    const abs = Math.abs(c);
    const num = abs === 1 && i > 0 ? '' : texNum(abs);
    terms.push(`${c < 0 ? '-' : '+'} ${num}${mono}`);
  }
  if (!terms.length) return '0';
  const s = terms.join(' ');
  return s.startsWith('+ ') ? s.slice(2) : s;
}
