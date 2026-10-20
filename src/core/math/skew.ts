import { get, identity, mul, mulVec, rows, symEig, transpose, zeros, type Mat, type Vec } from './matrix';

/**
 * Skew-symmetric matrices K^T = −K built from a coordinate vector, their real
 * normal form K = Q·blockdiag(λ₁J, …, λₘJ, 0)·Q^T, and what K, its powers and
 * its exponential do to the unit sphere.
 */

/** Independent entries of an n×n skew matrix, n(n−1)/2 = number of coordinate planes. */
export function skewDim(n: number): number {
  return (n * (n - 1)) / 2;
}

/** Index pairs (i, j), i < j, in lexicographic order: one per coordinate plane. */
export function skewPairs(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}

/** Cross-product (hat) matrix: hat(w) x = w × x. */
export function hat(w: Vec): Mat {
  const [a, b, c] = [w[0]!, w[1]!, w[2]!];
  return [
    [0, -c, b],
    [c, 0, -a],
    [-b, a, 0],
  ];
}

export function cross(a: Vec, b: Vec): Vec {
  return [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
}

/**
 * Skew matrix from its n(n−1)/2 coordinates. For n = 3 this is the hat map
 * (K x = v × x). Otherwise component k generates rotation from e_i towards
 * e_j for the k-th pair i < j: K[j][i] = v_k, K[i][j] = −v_k (so n = 2 gives vJ).
 */
export function skewFromVector(v: Vec, n: number): Mat {
  if (v.length !== skewDim(n)) throw new Error(`skewFromVector: need ${skewDim(n)} components for n=${n}`);
  if (n === 3) return hat(v);
  const K = zeros(n);
  skewPairs(n).forEach(([i, j], k) => {
    K[j]![i] = v[k]!;
    K[i]![j] = -v[k]!;
  });
  return K;
}

export interface SkewNormalForm {
  /** Orthogonal; columns (q₁, p₁, q₂, p₂, …, null vectors) with K q = λ p, K p = −λ q. */
  Q: Mat;
  /** λ₁ ≥ λ₂ ≥ … > 0: one rotation speed per invariant plane span(q_j, p_j). */
  lambdas: number[];
  /** Dimension of ker K, n − 2·lambdas.length. */
  nullity: number;
}

const dotv = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i]!, 0);
const normv = (a: Vec) => Math.sqrt(dotv(a, a));

/** Remove the components of v along the (orthonormal) basis vectors. */
function orthogonalize(v: Vec, basis: Vec[]): Vec {
  let w = v.slice();
  for (const b of basis) {
    const c = dotv(w, b);
    w = w.map((x, i) => x - c * b[i]!);
  }
  return w;
}

/**
 * Real normal form of a skew matrix. K^T K = −K² is symmetric positive
 * semidefinite with eigenvalues λ_j² (each twice) and 0. For a unit
 * eigenvector q with λ > 0, p = K q / λ is a unit vector orthogonal to q and
 * K p = K² q / λ = −λ q, so K acts as λJ on span(q, p). That plane's
 * orthogonal complement is K-invariant too, so the construction repeats on it.
 */
export function skewNormalForm(K: Mat): SkewNormalForm {
  const n = rows(K);
  const { values, vectors } = symEig(mul(transpose(K), K));
  const cols = transpose(vectors);
  const thr = 1e-12 * Math.max(1, values[0] ?? 0);
  const basis: Vec[] = [];
  const lambdas: number[] = [];
  for (let k = 0; k < n && basis.length + 1 < n; k++) {
    if (values[k]! <= thr) break;
    let q = orthogonalize(cols[k]!, basis);
    const nq = normv(q);
    if (nq < 1e-6) continue; // already covered by an earlier plane of the same eigenspace
    q = q.map((x) => x / nq);
    let p = orthogonalize(mulVec(K, q), basis);
    const lam = normv(p);
    if (lam * lam <= thr) continue;
    p = p.map((x) => x / lam);
    basis.push(q, p);
    lambdas.push(lam);
  }
  // Complete with ker K (orthogonal complement), via Gram–Schmidt on e_1..e_n.
  for (let i = 0; i < n && basis.length < n; i++) {
    const e = identity(n)[i]!;
    const w = orthogonalize(orthogonalize(e, basis), basis);
    const nw = normv(w);
    if (nw > 1e-8) basis.push(w.map((x) => x / nw));
  }
  return { Q: transpose(basis), lambdas, nullity: n - 2 * lambdas.length };
}

/**
 * Semi-axis lengths of K^k(S^{n−1}), i.e. the singular values of K^k, largest
 * first: λ_j^k twice per plane, then 0 (k ≥ 1) or 1 (k = 0) per null direction.
 */
export function powerSemiAxes(nf: SkewNormalForm, k: number): number[] {
  const out = nf.lambdas.flatMap((l) => [l ** k, l ** k]);
  for (let i = 0; i < nf.nullity; i++) out.push(k === 0 ? 1 : 0);
  return out.sort((a, b) => b - a);
}

/**
 * e^{tK} from the normal form: a rotation by angle λ_j t in every invariant
 * plane and the identity on ker K. Orthogonal with determinant 1.
 */
export function expSkew(nf: SkewNormalForm, t: number): Mat {
  const { Q, lambdas } = nf;
  const n = rows(Q);
  const D = identity(n);
  lambdas.forEach((l, j) => {
    const c = Math.cos(l * t);
    const s = Math.sin(l * t);
    D[2 * j]![2 * j] = c;
    D[2 * j]![2 * j + 1] = -s;
    D[2 * j + 1]![2 * j] = s;
    D[2 * j + 1]![2 * j + 1] = c;
  });
  return mul(mul(Q, D), transpose(Q));
}

/** Rodrigues: e^{t·hat(w)} = I + sin θ K̂ + (1 − cos θ) K̂², θ = t|w|, K̂ = hat(w/|w|). */
export function rodrigues(w: Vec, t: number): Mat {
  const r = Math.hypot(w[0]!, w[1]!, w[2]!);
  if (r === 0) return identity(3);
  const Kh = hat(w.map((x) => x / r));
  const K2 = mul(Kh, Kh);
  const th = r * t;
  return identity(3).map((row, i) => row.map((v, j) => v + Math.sin(th) * get(Kh, i, j) + (1 - Math.cos(th)) * get(K2, i, j)));
}

/** Deterministic PRNG (mulberry32) so point clouds don't jump between renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` points uniformly distributed on S^{n−1}: normalised standard
 * Gaussian vectors (the Gaussian is rotation invariant, so its direction is uniform).
 */
export function sampleSphere(n: number, count: number, seed = 1): Vec[] {
  const rnd = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const out: Vec[] = [];
  while (out.length < count) {
    const v = Array.from({ length: n }, gauss);
    const r = normv(v);
    if (r > 1e-9) out.push(v.map((x) => x / r));
  }
  return out;
}
