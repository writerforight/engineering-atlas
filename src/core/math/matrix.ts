/**
 * Dense square/rectangular matrix helpers on plain number[][] arrays.
 * Pure functions, no UI dependencies. Sizes are small (2x2, 4x4), so clarity
 * beats raw performance here.
 */

export type Vec = number[];
export type Mat = number[][];

export function zeros(rows: number, cols = rows): Mat {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

export function identity(n: number): Mat {
  const I = zeros(n);
  for (let i = 0; i < n; i++) I[i]![i] = 1;
  return I;
}

export function rows(A: Mat): number {
  return A.length;
}

export function cols(A: Mat): number {
  return A[0]?.length ?? 0;
}

export function get(A: Mat, i: number, j: number): number {
  return A[i]![j]!;
}

export function clone(A: Mat): Mat {
  return A.map((r) => r.slice());
}

export function add(A: Mat, B: Mat): Mat {
  return A.map((r, i) => r.map((v, j) => v + get(B, i, j)));
}

export function sub(A: Mat, B: Mat): Mat {
  return A.map((r, i) => r.map((v, j) => v - get(B, i, j)));
}

export function scale(A: Mat, k: number): Mat {
  return A.map((r) => r.map((v) => v * k));
}

/** Linear combination sum_k c_k A_k (all matrices of equal shape). */
export function combine(terms: ReadonlyArray<readonly [number, Mat]>): Mat {
  const first = terms[0];
  if (!first) throw new Error('combine: empty term list');
  let out = zeros(rows(first[1]), cols(first[1]));
  for (const [c, A] of terms) out = add(out, scale(A, c));
  return out;
}

export function mul(A: Mat, B: Mat): Mat {
  const n = rows(A);
  const m = cols(B);
  const inner = cols(A);
  if (inner !== rows(B)) throw new Error(`mul: shape mismatch ${n}x${inner} * ${rows(B)}x${m}`);
  const C = zeros(n, m);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < inner; k++) {
      const a = get(A, i, k);
      if (a === 0) continue;
      for (let j = 0; j < m; j++) C[i]![j]! += a * get(B, k, j);
    }
  }
  return C;
}

export function mulVec(A: Mat, x: Vec): Vec {
  return A.map((r) => r.reduce((s, v, j) => s + v * x[j]!, 0));
}

export function transpose(A: Mat): Mat {
  return Array.from({ length: cols(A) }, (_, j) => A.map((r) => r[j]!));
}

export function trace(A: Mat): number {
  let s = 0;
  for (let i = 0; i < rows(A); i++) s += get(A, i, i);
  return s;
}

/** Commutator [A, B] = AB - BA. */
export function commutator(A: Mat, B: Mat): Mat {
  return sub(mul(A, B), mul(B, A));
}

/** Frobenius norm. */
export function norm(A: Mat): number {
  let s = 0;
  for (const r of A) for (const v of r) s += v * v;
  return Math.sqrt(s);
}

/** Largest absolute entry of A - B. */
export function maxAbsDiff(A: Mat, B: Mat): number {
  let m = 0;
  A.forEach((r, i) => r.forEach((v, j) => (m = Math.max(m, Math.abs(v - get(B, i, j))))));
  return m;
}

export function approxEqual(A: Mat, B: Mat, tol = 1e-9): boolean {
  return maxAbsDiff(A, B) <= tol;
}

/** Truncated power series sum_{k=0}^{terms-1} (tA)^k / k!. */
export function expSeries(A: Mat, t = 1, terms = 30): Mat {
  const n = rows(A);
  const tA = scale(A, t);
  let term = identity(n);
  let sum = identity(n);
  for (let k = 1; k < terms; k++) {
    term = scale(mul(term, tA), 1 / k);
    sum = add(sum, term);
  }
  return sum;
}

/**
 * Matrix exponential e^{tA} via scaling and squaring:
 * e^{X} = (e^{X / 2^s})^{2^s}, with a Taylor series for the small argument.
 * Accurate to ~1e-14 relative for the small matrices used in this project.
 */
export function expm(A: Mat, t = 1): Mat {
  const X = scale(A, t);
  const nrm = norm(X);
  const s = nrm > 0.5 ? Math.ceil(Math.log2(nrm / 0.5)) : 0;
  let E = expSeries(scale(X, 2 ** -s), 1, 18);
  for (let i = 0; i < s; i++) E = mul(E, E);
  return E;
}

// ---- 2x2 helpers ---------------------------------------------------------

export function mat2(a: number, b: number, c: number, d: number): Mat {
  return [
    [a, b],
    [c, d],
  ];
}

export function det2(A: Mat): number {
  return get(A, 0, 0) * get(A, 1, 1) - get(A, 0, 1) * get(A, 1, 0);
}

export function inv2(A: Mat): Mat {
  const d = det2(A);
  if (Math.abs(d) < 1e-300) throw new Error('inv2: singular matrix');
  return mat2(get(A, 1, 1) / d, -get(A, 0, 1) / d, -get(A, 1, 0) / d, get(A, 0, 0) / d);
}

/** Eigenvalues of a 2x2 matrix as complex pairs [re, im]. */
export function eig2(A: Mat): [[number, number], [number, number]] {
  const tr = trace(A);
  const disc = (tr * tr) / 4 - det2(A);
  if (disc >= 0) {
    const r = Math.sqrt(disc);
    return [
      [tr / 2 + r, 0],
      [tr / 2 - r, 0],
    ];
  }
  const r = Math.sqrt(-disc);
  return [
    [tr / 2, r],
    [tr / 2, -r],
  ];
}

/** Rotation generator J = [[0,-1],[1,0]]; e^{tJ} rotates counter-clockwise by t. */
export const J2: Mat = mat2(0, -1, 1, 0);
