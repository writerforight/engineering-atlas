import { describe, expect, it } from 'vitest';
import { fullSvd, identifyLinear, pinv, randnMat, svd } from './linearId';
import { maxAbsDiff, mul, mulVec, transpose } from './matrix';

describe('svd / pinv', () => {
  it('reconstructs A = U Σ Vᵀ for a wide and a tall matrix', () => {
    for (const [m, n] of [[2, 4], [5, 3]] as const) {
      const A = randnMat(m, n, 7 + m);
      const d = svd(A);
      expect(d.rank).toBe(Math.min(m, n));
      const US = d.U.map((r) => r.map((v, k) => v * d.s[k]!));
      const Vr = d.V.map((r) => r.slice(0, d.rank));
      expect(maxAbsDiff(mul(US, transpose(Vr)), A)).toBeLessThan(1e-9);
    }
  });

  it('satisfies the Penrose identity A A⁺ A = A, also for rank-deficient A', () => {
    const B = randnMat(4, 2, 3);
    const A = mul(B, randnMat(2, 5, 4)); // 4×5, rank 2
    const { P, svd: d } = pinv(A);
    expect(d.rank).toBe(2);
    expect(maxAbsDiff(mul(mul(A, P), A), A)).toBeLessThan(1e-8);
  });
});

describe('fullSvd', () => {
  it('gives orthogonal U, V with U Σ Vᵀ = A and V Σ⁺ Uᵀ = A⁺, also when rank-deficient', () => {
    for (const A of [randnMat(3, 5, 41), mul(randnMat(4, 1, 42), randnMat(1, 3, 43))]) {
      const { U, S, V, Splus } = fullSvd(A);
      const I = (k: number) => Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
      expect(maxAbsDiff(mul(transpose(U), U), I(U.length))).toBeLessThan(1e-8);
      expect(maxAbsDiff(mul(transpose(V), V), I(V.length))).toBeLessThan(1e-8);
      expect(maxAbsDiff(mul(mul(U, S), transpose(V)), A)).toBeLessThan(1e-8);
      expect(maxAbsDiff(mul(mul(V, Splus), transpose(U)), pinv(A).P)).toBeLessThan(1e-8);
    }
  });
});

describe('identifyLinear', () => {
  it('recovers A exactly from K ≥ n noise-free experiments', () => {
    const A = randnMat(3, 4, 11);
    const X = randnMat(4, 6, 12);
    const { Ahat } = identifyLinear(X, mul(A, X));
    expect(maxAbsDiff(Ahat, A)).toBeLessThan(1e-9);
  });

  it('with m ≥ n, Â⁺ maps the output back to the input', () => {
    const A = randnMat(5, 3, 21);
    const X = randnMat(3, 4, 22);
    const { Ahat } = identifyLinear(X, mul(A, X));
    const x = [0.5, -1, 2];
    const xh = mulVec(pinv(Ahat).P, mulVec(A, x));
    xh.forEach((v, i) => expect(v).toBeCloseTo(x[i]!, 8));
  });

  it('with m < n, Â⁺ y only returns the row-space part of x', () => {
    const A = randnMat(2, 3, 31);
    const X = randnMat(3, 5, 32);
    const { Ahat } = identifyLinear(X, mul(A, X));
    const x = [1, 2, 3];
    const xh = mulVec(pinv(Ahat).P, mulVec(A, x));
    // same output, but a different (minimum-norm) input
    mulVec(A, xh).forEach((v, i) => expect(v).toBeCloseTo(mulVec(A, x)[i]!, 8));
    expect(Math.hypot(...xh)).toBeLessThan(Math.hypot(...x));
  });
});
