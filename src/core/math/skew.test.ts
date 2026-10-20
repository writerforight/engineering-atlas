import { describe, expect, it } from 'vitest';
import { add, approxEqual, expm, identity, matPow, maxAbsDiff, mul, mulVec, scale, symEig, transpose, type Mat } from './matrix';
import {
  cross,
  expSkew,
  hat,
  powerSemiAxes,
  rodrigues,
  sampleSphere,
  skewDim,
  skewFromVector,
  skewNormalForm,
} from './skew';

const sym = (A: Mat) => scale(add(A, transpose(A)), 0.5);
const blockForm = (lambdas: number[], n: number): Mat => {
  const B = identity(n).map((r) => r.map(() => 0));
  lambdas.forEach((l, j) => {
    B[2 * j]![2 * j + 1] = -l;
    B[2 * j + 1]![2 * j] = l;
  });
  return B;
};

const cases: Array<[number, number[]]> = [
  [2, [1.3]],
  [3, [0.5, -0.8, 1.1]],
  [4, [1.3, 0.2, -0.4, 0.5, 0.3, 0.7]],
  [4, [1, 0, 0, 0, 0, 1]], // J ⊕ J: one repeated λ
  [5, [0.3, -1.1, 0.4, 0.9, 0.2, -0.5, 0.8, 0.1, -0.7, 0.6]],
  [6, Array.from({ length: 15 }, (_, k) => Math.sin(1.7 * k + 0.3))],
  [3, [0, 0, 0]],
];

describe('symEig', () => {
  it('reconstructs a symmetric matrix with orthonormal eigenvectors', () => {
    const A = sym([
      [4, 1, -2, 0.5],
      [0, 3, 1, 2],
      [1, 0, -1, 0.3],
      [2, 1, 0, 2],
    ]);
    const { values, vectors: V } = symEig(A);
    const D = values.map((v, i) => values.map((_, j) => (i === j ? v : 0)));
    expect(approxEqual(mul(mul(V, D), transpose(V)), A, 1e-12)).toBe(true);
    expect(approxEqual(mul(transpose(V), V), identity(4), 1e-12)).toBe(true);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });
});

describe('skew matrix from a vector', () => {
  it('n = 3 is the cross-product matrix', () => {
    const w = [0.5, -0.8, 1.1];
    const x = [0.2, 1.4, -0.6];
    const K = skewFromVector(w, 3);
    expect(maxAbsDiff([mulVec(K, x)], [cross(w, x)])).toBeLessThan(1e-15);
  });

  it.each(cases)('n=%i: K^T = −K and x·Kx = 0', (n, v) => {
    expect(v.length).toBe(skewDim(n));
    const K = skewFromVector(v, n);
    expect(approxEqual(transpose(K), scale(K, -1), 0)).toBe(true);
    for (const x of sampleSphere(n, 5, 7)) {
      expect(Math.abs(mulVec(K, x).reduce((s, y, i) => s + y * x[i]!, 0))).toBeLessThan(1e-14);
    }
  });
});

describe('skew normal form', () => {
  it.each(cases)('n=%i: K = Q blockdiag(λJ, 0) Q^T with Q orthogonal', (n, v) => {
    const K = skewFromVector(v, n);
    const { Q, lambdas, nullity } = skewNormalForm(K);
    expect(approxEqual(mul(transpose(Q), Q), identity(n), 1e-10)).toBe(true);
    expect(approxEqual(mul(mul(Q, blockForm(lambdas, n)), transpose(Q)), K, 1e-10)).toBe(true);
    expect(2 * lambdas.length + nullity).toBe(n);
    if (n % 2 === 1) expect(nullity).toBeGreaterThanOrEqual(1);
    lambdas.forEach((l, j) => j > 0 && expect(l).toBeLessThanOrEqual(lambdas[j - 1]! + 1e-12));
  });

  it('n = 3: the single λ is |ω| and the null direction is ω', () => {
    const w = [0.5, -0.8, 1.1];
    const { Q, lambdas } = skewNormalForm(hat(w));
    const r = Math.hypot(...w);
    expect(lambdas[0]).toBeCloseTo(r, 12);
    const nullDir = Q.map((row) => row[2]!);
    expect(Math.abs(nullDir.reduce((s, x, i) => s + x * w[i]!, 0))).toBeCloseTo(r, 12);
  });
});

describe('powers of K', () => {
  it('3D: K² = ωω^T − |ω|²I and K³ = −|ω|²K', () => {
    const w = [0.5, -0.8, 1.1];
    const K = hat(w);
    const r2 = w.reduce((s, x) => s + x * x, 0);
    const wwT = w.map((a) => w.map((b) => a * b));
    expect(approxEqual(matPow(K, 2), add(wwT, scale(identity(3), -r2)), 1e-14)).toBe(true);
    expect(approxEqual(matPow(K, 3), scale(K, -r2), 1e-14)).toBe(true);
  });

  it.each(cases)('n=%i: (K^k)^T = (−1)^k K^k and semi-axes are λ_j^k', (n, v) => {
    const K = skewFromVector(v, n);
    const nf = skewNormalForm(K);
    for (let k = 0; k <= 5; k++) {
      const A = matPow(K, k);
      expect(approxEqual(transpose(A), scale(A, (-1) ** k), 1e-12)).toBe(true);
      const sv = symEig(mul(transpose(A), A)).values.map((x) => Math.sqrt(Math.max(0, x)));
      const want = powerSemiAxes(nf, k);
      sv.forEach((s, i) => expect(Math.abs(s - want[i]!)).toBeLessThan(1e-7 * Math.max(1, want[0]!)));
    }
  });
});

describe('exponential of K', () => {
  it.each(cases)('n=%i: normal-form exp matches expm and is a rotation', (n, v) => {
    const K = skewFromVector(v, n);
    const nf = skewNormalForm(K);
    for (const t of [0.4, 1.7, -2.3]) {
      const E = expSkew(nf, t);
      expect(approxEqual(E, expm(K, t), 1e-10)).toBe(true);
      expect(approxEqual(mul(transpose(E), E), identity(n), 1e-12)).toBe(true);
    }
  });

  it('Rodrigues formula agrees with expm', () => {
    const w = [0.5, -0.8, 1.1];
    for (const t of [0.3, 1, 4.2]) expect(approxEqual(rodrigues(w, t), expm(hat(w), t), 1e-12)).toBe(true);
  });
});

describe('sampleSphere', () => {
  it('returns unit vectors deterministically', () => {
    const a = sampleSphere(5, 50, 3);
    expect(a).toEqual(sampleSphere(5, 50, 3));
    for (const x of a) expect(Math.hypot(...x)).toBeCloseTo(1, 14);
  });
});
